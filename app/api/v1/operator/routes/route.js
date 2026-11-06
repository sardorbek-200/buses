const mongoose = require("mongoose");
const connectDb = require("@/lib/db");
const { authenticate } = require("@/lib/auth");
const { Route, City } = require("@/lib/models");
const { ok, fail, errorResponse } = require("@/lib/http");

export async function GET(request) {
  const auth = await authenticate(request, ["operator", "admin"]);
  if (auth.error) return fail(auth.error, "UNAUTHORIZED", auth.status);
  try {
    await connectDb();
    const filter = auth.user.role === "admin" ? {} : { operatorId: auth.user.operatorId };
    const routes = await Route.find(filter)
      .populate("fromCityId", "name").populate("toCityId", "name").sort({ createdAt: -1 }).lean();
    return ok(routes);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request) {
  const auth = await authenticate(request, ["operator", "admin"]);
  if (auth.error) return fail(auth.error, "UNAUTHORIZED", auth.status);
  try {
    const body = await request.json();
    if (!mongoose.isValidObjectId(body.fromCityId) || !mongoose.isValidObjectId(body.toCityId) ||
      body.fromCityId === body.toCityId || !Number.isFinite(Number(body.durationMinutes)) ||
      Number(body.durationMinutes) < 1) {
      return fail("Marshrut ma'lumotlarini tekshiring", "VALIDATION_ERROR", 422);
    }
    if (!auth.user.operatorId && auth.user.role !== "admin") return fail("Operator profili biriktirilmagan", "OPERATOR_REQUIRED", 403);
    await connectDb();
    const [from, to] = await Promise.all([City.exists({ _id: body.fromCityId }), City.exists({ _id: body.toCityId })]);
    if (!from || !to) return fail("Shahar topilmadi", "CITY_NOT_FOUND", 404);
    const route = await Route.create({
      operatorId: auth.user.operatorId || body.operatorId,
      fromCityId: body.fromCityId, toCityId: body.toCityId,
      stops: [], distanceKm: Number(body.distanceKm) || undefined,
      durationMinutes: Number(body.durationMinutes)
    });
    return ok(route, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
