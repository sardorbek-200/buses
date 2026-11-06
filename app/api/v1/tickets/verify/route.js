const mongoose = require("mongoose");
const { createHmac, timingSafeEqual } = require("node:crypto");
const connectDb = require("@/lib/db");
const { authenticate, requiredSecret } = require("@/lib/auth");
const { Ticket, Booking } = require("@/lib/models");
const { ok, fail, errorResponse } = require("@/lib/http");

export async function POST(request) {
  const auth = await authenticate(request, ["controller", "operator", "admin"]);
  if (auth.error) return fail(auth.error, "UNAUTHORIZED", auth.status);
  try {
    await connectDb();
    const body = await request.json();
    const parts = String(body.qr || "").split(".");
    if (parts.length !== 2 || !mongoose.isValidObjectId(parts[0])) {
      return fail("Chipta topilmadi", "TICKET_NOT_FOUND", 404);
    }
    const expected = createHmac("sha256", requiredSecret("QR_HMAC_SECRET")).update(parts[0]).digest("hex");
    const a = Buffer.from(parts[1]);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return fail("QR kodi haqiqiy emas", "INVALID_QR", 400);
    const ticket = await Ticket.findById(parts[0]);
    if (!ticket) return fail("Chipta topilmadi", "TICKET_NOT_FOUND", 404);
    if (ticket.status === "used") return fail("Allaqachon ishlatilgan", "TICKET_ALREADY_USED", 409);
    if (ticket.status !== "valid") return fail("Chipta bekor qilingan", "TICKET_CANCELLED", 409);
    const booking = await Booking.findById(ticket.bookingId)
      .populate({ path: "tripId", populate: [{ path: "operatorId", select: "_id" }, { path: "routeId", populate: [{ path: "fromCityId", select: "name" }, { path: "toCityId", select: "name" }] }] });
    if (!booking || !["paid", "used"].includes(booking.status)) return fail("Chipta topilmadi", "TICKET_NOT_FOUND", 404);
    if (auth.user.role !== "admin" &&
      String(booking.tripId.operatorId?._id || booking.tripId.operatorId) !== String(auth.user.operatorId)) {
      return fail("Bu reys chiptalarini tekshirishga ruxsat yo'q", "FORBIDDEN", 403);
    }
    if (body.tripId && String(booking.tripId._id) !== String(body.tripId)) return fail("Boshqa reys", "WRONG_TRIP", 409);
    const updated = await Ticket.findOneAndUpdate(
      { _id: ticket._id, status: "valid" },
      { $set: { status: "used", usedAt: new Date(), checkedBy: auth.user._id } },
      { new: true }
    );
    if (!updated) return fail("Allaqachon ishlatilgan", "TICKET_ALREADY_USED", 409);
    const remaining = await Ticket.countDocuments({ bookingId: booking._id, status: "valid" });
    if (!remaining) await Booking.updateOne({ _id: booking._id, status: "paid" }, { $set: { status: "used" } });
    const passenger = booking.passengers.find((item) => item.seatNumber === ticket.seatNumber);
    return ok({
      result: "valid", message: "Haqiqiy chipta",
      passenger: passenger?.fullName, seatNumber: ticket.seatNumber,
      from: booking.tripId.routeId.fromCityId.name, to: booking.tripId.routeId.toCityId.name,
      departAt: booking.tripId.departAt
    });
  } catch (error) {
    return errorResponse(error);
  }
}
