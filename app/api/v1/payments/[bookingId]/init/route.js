const mongoose = require("mongoose");
const connectDb = require("@/lib/db");
const { authenticate } = require("@/lib/auth");
const { Booking, Payment } = require("@/lib/models");
const { ok, fail, errorResponse } = require("@/lib/http");

export async function POST(request, context) {
  const auth = await authenticate(request, ["passenger"]);
  if (auth.error) return fail(auth.error, "UNAUTHORIZED", auth.status);
  try {
    const { bookingId } = await context.params;
    if (!mongoose.isValidObjectId(bookingId)) return fail("Bron topilmadi", "NOT_FOUND", 404);
    await connectDb();
    const booking = await Booking.findById(bookingId);
    if (!booking || String(booking.userId) !== String(auth.user._id)) return fail("Bron topilmadi", "NOT_FOUND", 404);
    if (booking.status !== "pending" || booking.expiresAt <= new Date()) return fail("Bron muddati tugagan", "BOOKING_EXPIRED", 409);
    const payment = await Payment.findOneAndUpdate(
      { bookingId },
      { $setOnInsert: { bookingId, amount: booking.totalPrice, provider: "mock", status: "created" } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return ok({ paymentId: String(payment._id), amount: payment.amount, provider: payment.provider, testPayment: true });
  } catch (error) {
    return errorResponse(error);
  }
}
