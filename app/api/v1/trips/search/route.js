const connectDb = require("@/lib/db");
const { City, Route, Trip, Bus, SeatLock } = require("@/lib/models");
const { ok, fail, errorResponse } = require("@/lib/http");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request) {
  try {
    await connectDb();
    const params = request.nextUrl.searchParams;
    const from = (params.get("from") || "").trim();
    const to = (params.get("to") || "").trim();
    const date = params.get("date");
    const passengers = Math.max(1, Math.min(5, Number(params.get("passengers") || 1)));
    if (!from || !to || !date || Number.isNaN(Date.parse(date))) {
      return fail("Jo'nash shahri, manzil va sana kiritilishi shart", "VALIDATION_ERROR", 422);
    }
    const [fromCity, toCity] = await Promise.all([
      City.findOne({ $or: [{ slug: from.toLowerCase() }, { name: { $regex: `^${escapeRegex(from)}$`, $options: "i" } }] }).select("_id"),
      City.findOne({ $or: [{ slug: to.toLowerCase() }, { name: { $regex: `^${escapeRegex(to)}$`, $options: "i" } }] }).select("_id")
    ]);
    if (!fromCity || !toCity) return ok([]);
    const routeIds = await Route.find({ fromCityId: fromCity._id, toCityId: toCity._id }).distinct("_id");
    const start = new Date(`${date}T00:00:00+05:00`);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const trips = await Trip.find({
      routeId: { $in: routeIds }, departAt: { $gte: start, $lt: end }, status: { $in: ["scheduled", "boarding"] }
    }).populate({ path: "routeId", populate: [{ path: "fromCityId", select: "name slug" }, { path: "toCityId", select: "name slug" }] })
      .populate("busId", "model type seatCount").populate("operatorId", "name").sort({ departAt: 1 }).limit(100).lean();
    const tripIds = trips.map((trip) => trip._id);
    const locks = await SeatLock.aggregate([
      { $match: { tripId: { $in: tripIds }, $or: [{ status: "paid" }, { status: "pending", expiresAt: { $gt: new Date() } }] } },
      { $group: { _id: "$tripId", count: { $sum: 1 } } }
    ]);
    const occupied = new Map(locks.map((lock) => [String(lock._id), lock.count]));
    const results = trips.map((trip) => {
      const availableSeats = Math.max(0, trip.busId.seatCount - (occupied.get(String(trip._id)) || 0));
      return {
        id: String(trip._id), from: trip.routeId.fromCityId.name, to: trip.routeId.toCityId.name,
        departAt: trip.departAt, arriveAt: trip.arriveAt, durationMinutes: trip.routeId.durationMinutes,
        price: trip.price, operator: trip.operatorId.name, busType: trip.busId.type, busModel: trip.busId.model,
        availableSeats, unavailable: availableSeats < passengers
      };
    });
    return ok(results);
  } catch (error) {
    return errorResponse(error);
  }
}
