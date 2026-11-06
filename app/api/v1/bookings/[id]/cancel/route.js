const mongoose = require("mongoose");
const connectDb = require("@/lib/db");
const { authenticate } = require("@/lib/auth");
const { Booking, Trip, SeatLock, Ticket, Payment, AuditLog } = require("@/lib/models");
const { ok, fail, errorResponse } = require("@/lib/http");
const { emitTripEvent } = require("@/lib/seat-events");
const { calculateRefund } = require("@/lib/business");

export async function POST(request, context) {
  const auth = await authenticate(request);
  if (auth.error) return fail(auth.error, "UNAUTHORIZED", auth.status);
  const session = await mongoose.startSession();
  try {
    const { id } = await context.params;
    if (!mongoose.isValidObjectId(id)) return fail("Bron topilmadi", "NOT_FOUND", 404);
    await connectDb();
    let result;
    await session.withTransaction(async () => {
      const booking = await Booking.findById(id).session(session);
      if (!booking || String(booking.userId) !== String(auth.user._id)) throw Object.assign(new Error("BOOKING_NOT_FOUND"), { status: 404 });
      if (booking.status !== "pending" && booking.status !== "paid") throw Object.assign(new Error("BOOKING_NOT_CANCELLABLE"), { status: 409 });
      const trip = await Trip.findById(booking.tripId).session(session);
      const refund = booking.status === "pending"
        ? { percent: 100, amount: booking.totalPrice }
        : calculateRefund(booking.totalPrice, trip.departAt);
      booking.status = "cancelled";
      booking.cancelledAt = new Date();
      await booking.save({ session });
      await SeatLock.deleteMany({ bookingId: booking._id }, { session });
      await Ticket.updateMany({ bookingId: booking._id, status: "valid" }, { $set: { status: "cancelled" } }, { session });
      if (refund.percent < 100) {
        const payment = await Payment.findOne({ bookingId: booking._id }).session(session);
        if (payment?.status === "success") {
          payment.refundAmount = refund.amount;
          payment.status = refund.amount ? "partially_refunded" : "refunded";
          await payment.save({ session });
        }
      }
      await AuditLog.create([{
        userId: auth.user._id, action: "booking.cancelled", entity: "Booking",
        entityId: String(booking._id), meta: { refundPercent: refund.percent, refundAmount: refund.amount }
      }], { session });
      result = { status: booking.status, refundPercent: refund.percent, refundAmount: refund.amount, currency: "UZS", tripId: String(booking.tripId) };
    });
    emitTripEvent(result.tripId, "seat:released", { bookingId: id });
    return ok(result);
  } catch (error) {
    if (error.message === "BOOKING_NOT_FOUND") return fail("Bron topilmadi", "NOT_FOUND", error.status);
    if (error.message === "BOOKING_NOT_CANCELLABLE") return fail("Bu bronni bekor qilib bo'lmaydi", "BOOKING_NOT_CANCELLABLE", error.status);
    return errorResponse(error);
  } finally {
    await session.endSession();
  }
}
