const connectDb = require("@/lib/db");
const { authenticate } = require("@/lib/auth");
const { City, AuditLog } = require("@/lib/models");
const { ok, fail, errorResponse } = require("@/lib/http");

function slugify(value) {
  return value.toLowerCase().trim().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function POST(request) {
  const auth = await authenticate(request, ["admin"]);
  if (auth.error) return fail(auth.error, "UNAUTHORIZED", auth.status);
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    if (name.length < 2 || name.length > 100) return fail("Shahar nomini tekshiring", "VALIDATION_ERROR", 422);
    await connectDb();
    const city = await City.create({ name, region: String(body.region || "").trim(), slug: slugify(name) });
    await AuditLog.create({
      userId: auth.user._id, action: "city.created", entity: "City",
      entityId: String(city._id), meta: { name: city.name, slug: city.slug }
    });
    return ok(city, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
