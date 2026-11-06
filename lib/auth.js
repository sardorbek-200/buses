const jwt = require("jsonwebtoken");
const { User, Operator } = require("./models");

function makeTokens(user) {
  const accessToken = jwt.sign(
    { sub: String(user._id), role: user.role },
    requiredSecret("JWT_ACCESS_SECRET"),
    { expiresIn: "15m" }
  );
  const refreshToken = jwt.sign(
    { sub: String(user._id), type: "refresh" },
    requiredSecret("JWT_REFRESH_SECRET"),
    { expiresIn: "7d" }
  );
  return { accessToken, refreshToken };
}

function requiredSecret(name) {
  if (!process.env[name] || process.env[name].length < 32) {
    throw new Error(`${name} must be configured with at least 32 characters`);
  }
  return process.env[name];
}

async function authenticate(request, roles = []) {
  const token = request.cookies.get("access_token")?.value ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: "Kirish talab qilinadi", status: 401 };
  let payload;
  try {
    payload = jwt.verify(token, requiredSecret("JWT_ACCESS_SECRET"));
  } catch {
    return { error: "Sessiya muddati tugagan", status: 401 };
  }
  const user = await User.findById(payload.sub).select("_id name phone role operatorId isPhoneVerified");
  if (!user || !user.isPhoneVerified) return { error: "Foydalanuvchi topilmadi", status: 401 };
  if (roles.length && !roles.includes(user.role)) return { error: "Ruxsat berilmagan", status: 403 };
  if (["operator", "controller"].includes(user.role)) {
    const operator = user.operatorId && await Operator.findById(user.operatorId).select("status");
    if (!operator || operator.status !== "active") return { error: "Operator profili faol emas", status: 403 };
  }
  return { user };
}

module.exports = { makeTokens, requiredSecret, authenticate };
