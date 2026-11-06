const mongoose = require("mongoose");
const connectDb = require("@/lib/db");
const { authenticate } = require("@/lib/auth");
const { Trip, Route, Bus } = require("@/lib/models");
const { ok, fail, errorResponse } = require("@/lib/http");

export async function GET(request) {
  const auth = await authenticate(request, ["operator", "admin"]);
  if (auth.error) return fail(auth.error, "UNAUTHORIZED", auth.status);
  try {
    await connectDb();
    const filter = auth.user.role === "admin" ? {} : { operatorId: auth.user.operatorId };
    const trips = await Trip.find(filter).sort({ departAt: 1 }).limit(200)
      .populate({ path: "routeId", populate: [{ path: "fromCityId", select: "name" }, { path: "toCityId", select: "name" }] })
      .populate("busId", "plateNumber model").lean();
    return ok(trips);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request) {
  const auth = await authenticate(request, ["operator", "admin"]);
  if (auth.error) return fail(auth.error, "UNAUTHORIZED", auth.status);
  try {
    const body = await request.json();
    if (!mongoose.isValidObjectId(body.routeId) || !mongoose.isValidObjectId(body.busId) ||
      !Number.isFinite(Number(body.price)) || Number(body.price) <= 0 ||
      !Number.isFinite(Date.parse(body.departAt)) || !Number.isFinite(Date.parse(body.arriveAt)) ||
      Date.parse(body.arriveAt) <= Date.parse(body.departAt)) {
      return fail("Reys ma'lumotlarini tekshiring", "VALIDATION_ERROR", 422);
    }
    if (!auth.user.operatorId && auth.user.role !== "admin") return fail("Operator profili biriktirilmagan", "OPERATOR_REQUIRED", 403);
    await connectDb();
    const ownerId = auth.user.operatorId || body.operatorId;
    const [route, bus] = await Promise.all([
      Route.findOne({ _id: body.routeId, operatorId: ownerId }),
      Bus.findOne({ _id: body.busId, operatorId: ownerId })
    ]);
    if (!route || !bus) return fail("Marshrut yoki avtobus ushbu operatorga tegishli emas", "RESOURCE_NOT_FOUND", 404);
    const trip = await Trip.create({
      routeId: route._id, busId: bus._id, operatorId: ownerId,
      departAt: new Date(body.departAt), arriveAt: new Date(body.arriveAt), price: Number(body.price)
    });
    return ok(trip, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
