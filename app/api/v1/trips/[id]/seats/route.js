const mongoose = require("mongoose");
const connectDb = require("@/lib/db");
const { Trip, SeatLock } = require("@/lib/models");
const { ok, fail, errorResponse } = require("@/lib/http");

export async function GET(_request, context) {
  try {
    const { id } = await context.params;
    if (!mongoose.isValidObjectId(id)) return fail("Reys topilmadi", "NOT_FOUND", 404);
    await connectDb();
    const trip = await Trip.findById(id).populate("busId", "layout").lean();
    if (!trip) return fail("Reys topilmadi", "NOT_FOUND", 404);
    const [locks, paidTickets] = await Promise.all([
      SeatLock.find({ tripId: id, $or: [{ status: "paid" }, { status: "pending", expiresAt: { $gt: new Date() } }] })
        .select("seatNumber status expiresAt").lean(),
      Booking.find({ tripId: id, status: { $in: ["paid", "used"] } }).select("passengers.seatNumber").lean()
    ]);
    const occupied = new Set(paidTickets.flatMap((booking) => booking.passengers.map((passenger) => passenger.seatNumber)));
    const lockMap = new Map(locks.map((lock) => [lock.seatNumber, lock]));
    const seats = trip.busId.layout.cells.filter((cell) => cell.kind === "seat").map((cell) => {
      const lock = lockMap.get(cell.seatNumber);
      return {
        seatNumber: cell.seatNumber,
        status: occupied.has(cell.seatNumber) || lock?.status === "paid" ? "sold" : lock ? "held" : "available",
        expiresAt: lock?.status === "pending" ? lock.expiresAt : undefined
      };
    });
    return ok({ seats, layout: trip.busId.layout });
  } catch (error) {
    return errorResponse(error);
  }
}
