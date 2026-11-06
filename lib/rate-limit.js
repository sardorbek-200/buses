const { createHash } = require("node:crypto");
const { RateLimit } = require("./models");

async function checkRateLimit(request, action, max, windowMs, identity = "") {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const clientIp = forwardedFor || request.headers.get("x-real-ip") || "unknown";
  const key = createHash("sha256").update(`${action}:${clientIp}:${identity}`).digest("hex");
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  const record = await RateLimit.findOneAndUpdate(
    { key },
    [{
      $set: {
        count: { $cond: [{ $gt: ["$resetAt", now] }, { $add: [{ $ifNull: ["$count", 0] }, 1] }, 1] },
        resetAt: { $cond: [{ $gt: ["$resetAt", now] }, "$resetAt", resetAt] }
      }
    }],
    { upsert: true, new: true }
  ).lean();
  return {
    allowed: record.count <= max,
    retryAfterSeconds: Math.max(1, Math.ceil((record.resetAt.getTime() - now.getTime()) / 1000))
  };
}

module.exports = { checkRateLimit };
