const mongoose = require("mongoose");
const { randomBytes, createHmac } = require("node:crypto");
const connectDb = require("@/lib/db");
const { authenticate, requiredSecret } = require("@/lib/auth");
const { Booking, SeatLock, Ticket, Payment } = require("@/lib/models");
const { ok, fail, errorResponse } = require("@/lib/http");
const { emitTripEvent } = require("@/lib/seat-events");

function createQrPayload(ticketId) {
  const signature = createHmac("sha256", requiredSecret("QR_HMAC_SECRET")).update(String(ticketId)).digest("hex");
  return `${ticketId}.${signature}`;
}

export async function POST(request, context) {
  const auth = await authenticate(request, ["passenger"]);
  if (auth.error) return fail(auth.error, "UNAUTHORIZED", auth.status);
  if (process.env.NODE_ENV === "production" && process.env.MOCK_PAYMENTS !== "true") {
    return fail("Test to'lov ishlab chiqarish muhitida o'chirilgan", "PAYMENT_PROVIDER_UNAVAILABLE", 503);
  }
  const session = await mongoose.startSession();
  try {
    const { bookingId } = await context.params;
    if (!mongoose.isValidObjectId(bookingId)) return fail("Bron topilmadi", "NOT_FOUND", 404);
    await connectDb();
    let result;
    await session.withTransaction(async () => {
      const booking = await Booking.findById(bookingId).session(session);
      if (!booking || String(booking.userId) !== String(auth.user._id)) throw Object.assign(new Error("BOOKING_NOT_FOUND"), { status: 404 });
      if (booking.status === "paid") {
        const currentTickets = await Ticket.find({ bookingId }).session(session);
        result = { idempotent: true, tickets: currentTickets.map((ticket) => ({
          id: String(ticket._id), ticketNumber: ticket.ticketNumber, seatNumber: ticket.seatNumber,
          qr: createQrPayload(ticket._id)
        })) };
        return;
      }
      if (booking.status !== "pending" || !booking.expiresAt || booking.expiresAt <= new Date()) {
        throw Object.assign(new Error("BOOKING_EXPIRED"), { status: 409 });
      }
      const locks = await SeatLock.find({ bookingId, status: "pending", expiresAt: { $gt: new Date() } }).session(session);
      if (locks.length !== booking.passengers.length) throw Object.assign(new Error("SEAT_LOCK_LOST"), { status: 409 });
      booking.status = "paid";
      booking.paidAt = new Date();
      await booking.save({ session });
      await SeatLock.updateMany({ bookingId }, { $set: { status: "paid" }, $unset: { expiresAt: 1 } }, { session });
      const tickets = [];
      for (const passenger of booking.passengers) {
        const ticketId = new mongoose.Types.ObjectId();
        const ticket = new Ticket({
          _id: ticketId, bookingId, seatNumber: passenger.seatNumber,
          ticketNumber: `BT-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(3).toString("hex").toUpperCase()}`,
          qrHash: createHmac("sha256", requiredSecret("QR_HMAC_SECRET")).update(String(ticketId)).digest("hex")
        });
        await ticket.save({ session });
        tickets.push({
          id: String(ticketId), ticketNumber: ticket.ticketNumber,
          seatNumber: ticket.seatNumber, qr: createQrPayload(ticketId)
        });
      }
      const payment = await Payment.findOneAndUpdate(
        { bookingId },
        { $set: { status: "success", provider: "mock", amount: booking.totalPrice }, $setOnInsert: { bookingId } },
        { upsert: true, new: true, setDefaultsOnInsert: true, session }
      );
      if (!payment.providerTransactionId) {
        payment.providerTransactionId = `mock-${bookingId}`;
        await payment.save({ session });
      }
      result = { idempotent: false, tickets };
    });
    const booking = await Booking.findById(bookingId).select("tripId").lean();
    emitTripEvent(booking.tripId, "seat:sold", { bookingId });
    return ok(result);
  } catch (error) {
    if (error.message === "BOOKING_NOT_FOUND") return fail("Bron topilmadi", "NOT_FOUND", error.status);
    if (error.message === "BOOKING_EXPIRED") return fail("Bron muddati tugagan", "BOOKING_EXPIRED", error.status);
    if (error.message === "SEAT_LOCK_LOST") return fail("O'rindiq bronini tekshirishda xatolik", "SEAT_LOCK_LOST", error.status);
    return errorResponse(error);
  } finally {
    await session.endSession();
  }
}
