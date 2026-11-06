const mongoose = require("mongoose");
const connectDb = require("@/lib/db");
const { Trip } = require("@/lib/models");
const { ok, fail, errorResponse } = require("@/lib/http");

export async function GET(_request, context) {
  try {
    const { id } = await context.params;
    if (!mongoose.isValidObjectId(id)) return fail("Reys topilmadi", "NOT_FOUND", 404);
    await connectDb();
    const trip = await Trip.findById(id)
      .populate({ path: "routeId", populate: [{ path: "fromCityId", select: "name slug" }, { path: "toCityId", select: "name slug" }] })
      .populate("busId", "model type seatCount layout").populate("operatorId", "name").lean();
    if (!trip) return fail("Reys topilmadi", "NOT_FOUND", 404);
    return ok({
      id: String(trip._id), from: trip.routeId.fromCityId.name, to: trip.routeId.toCityId.name,
      departAt: trip.departAt, arriveAt: trip.arriveAt, durationMinutes: trip.routeId.durationMinutes,
      price: trip.price, status: trip.status, operator: trip.operatorId.name,
      bus: { model: trip.busId.model, type: trip.busId.type, layout: trip.busId.layout }
    });
  } catch (error) {
    return errorResponse(error);
  }
}
