const mongoose = require("mongoose");
const { createHmac } = require("node:crypto");
const connectDb = require("@/lib/db");
const { authenticate, requiredSecret } = require("@/lib/auth");
const { Booking, Ticket } = require("@/lib/models");
const { ok, fail, errorResponse } = require("@/lib/http");

export async function GET(_request, context) {
  const auth = await authenticate(_request);
  if (auth.error) return fail(auth.error, "UNAUTHORIZED", auth.status);
  try {
    const { id } = await context.params;
    if (!mongoose.isValidObjectId(id)) return fail("Bron topilmadi", "NOT_FOUND", 404);
    await connectDb();
    const booking = await Booking.findById(id)
      .populate({ path: "tripId", populate: { path: "routeId", populate: [{ path: "fromCityId", select: "name" }, { path: "toCityId", select: "name" }] } })
      .lean();
    if (!booking || String(booking.userId) !== String(auth.user._id)) return fail("Bron topilmadi", "NOT_FOUND", 404);
    const tickets = await Ticket.find({ bookingId: booking._id }).select("seatNumber ticketNumber status").lean();
    return ok({
      ...booking,
      id: String(booking._id),
      tickets: tickets.map((ticket) => ({
        id: String(ticket._id),
        seatNumber: ticket.seatNumber,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        qr: `${ticket._id}.${createHmac("sha256", requiredSecret("QR_HMAC_SECRET")).update(String(ticket._id)).digest("hex")}`
      }))
    });
  } catch (error) {
    return errorResponse(error);
  }
}
