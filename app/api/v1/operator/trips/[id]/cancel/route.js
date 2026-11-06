const mongoose = require("mongoose");
const connectDb = require("@/lib/db");
const { authenticate } = require("@/lib/auth");
const { Trip, Booking, SeatLock, Ticket, Payment, AuditLog } = require("@/lib/models");
const { ok, fail, errorResponse } = require("@/lib/http");
const { emitTripEvent } = require("@/lib/seat-events");

export async function POST(request, context) {
  const auth = await authenticate(request, ["operator", "admin"]);
  if (auth.error) return fail(auth.error, "UNAUTHORIZED", auth.status);
  const session = await mongoose.startSession();
  try {
    const { id } = await context.params;
    if (!mongoose.isValidObjectId(id)) return fail("Reys topilmadi", "NOT_FOUND", 404);
    await connectDb();
    let tripId;
    await session.withTransaction(async () => {
      const filter = auth.user.role === "admin"
        ? { _id: id }
        : { _id: id, operatorId: auth.user.operatorId };
      const trip = await Trip.findOne(filter).session(session);
      if (!trip) throw Object.assign(new Error("TRIP_NOT_FOUND"), { status: 404 });
      if (trip.status === "departed" || trip.status === "completed") {
        throw Object.assign(new Error("TRIP_ALREADY_DEPARTED"), { status: 409 });
      }
      trip.status = "cancelled";
      await trip.save({ session });
      const bookings = await Booking.find({ tripId: trip._id, status: { $in: ["pending", "paid"] } }).session(session);
      const ids = bookings.map((booking) => booking._id);
      await Booking.updateMany({ _id: { $in: ids } }, { $set: { status: "cancelled", cancelledAt: new Date() } }, { session });
      await SeatLock.deleteMany({ bookingId: { $in: ids } }, { session });
      await Ticket.updateMany({ bookingId: { $in: ids }, status: "valid" }, { $set: { status: "cancelled" } }, { session });
      await Payment.updateMany({ bookingId: { $in: ids }, status: "success" }, [
        { $set: { refundAmount: "$amount", status: "refunded" } }
      ], { session });
      await AuditLog.create([{
        userId: auth.user._id, action: "trip.cancelled", entity: "Trip",
        entityId: String(trip._id), meta: { bookingCount: ids.length }
      }], { session });
      tripId = String(trip._id);
    });
    emitTripEvent(tripId, "seat:released", { tripCancelled: true });
    return ok({ tripId, status: "cancelled", fullRefundsInitiated: true });
  } catch (error) {
    if (error.message === "TRIP_NOT_FOUND") return fail("Reys topilmadi", "NOT_FOUND", error.status);
    if (error.message === "TRIP_ALREADY_DEPARTED") return fail("Jo'nab ketgan reysni bekor qilib bo'lmaydi", "TRIP_ALREADY_DEPARTED", error.status);
    return errorResponse(error);
  } finally {
    await session.endSession();
  }
}
