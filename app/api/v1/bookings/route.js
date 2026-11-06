const mongoose = require("mongoose");
const { randomBytes } = require("node:crypto");
const connectDb = require("@/lib/db");
const { authenticate } = require("@/lib/auth");
const { Trip, Booking, SeatLock, Ticket } = require("@/lib/models");
const { ok, fail, errorResponse } = require("@/lib/http");
const { emitTripEvent } = require("@/lib/seat-events");

export async function POST(request) {
  const auth = await authenticate(request, ["passenger"]);
  if (auth.error) return fail(auth.error, "UNAUTHORIZED", auth.status);
  const session = await mongoose.startSession();
  try {
    await connectDb();
    const body = await request.json();
    const tripId = String(body.tripId || "");
    const passengers = Array.isArray(body.passengers) ? body.passengers : [];
    if (!mongoose.isValidObjectId(tripId) || passengers.length < 1 || passengers.length > 5) {
      return fail("Reys ID yoki yo'lovchilar soni noto'g'ri (1–5)", "VALIDATION_ERROR", 422);
    }
    const seatNumbers = passengers.map((passenger) => String(passenger.seatNumber || "").trim());
    if (new Set(seatNumbers).size !== seatNumbers.length || seatNumbers.some((seat) => !seat)) {
      return fail("O'rindiqlar takrorlanmasligi kerak", "VALIDATION_ERROR", 422);
    }
    for (const passenger of passengers) {
      if (String(passenger.fullName || "").trim().length < 3 ||
        !["male", "female"].includes(passenger.gender) ||
        !/^\+?\d{9,15}$/.test(String(passenger.phone || "").replace(/[^\d+]/g, ""))) {
        return fail("Yo'lovchi ma'lumotlarini tekshiring", "VALIDATION_ERROR", 422);
      }
    }
    const trip = await Trip.findById(tripId).populate("busId", "layout");
    if (!trip || !["scheduled", "boarding"].includes(trip.status)) return fail("Reys mavjud emas", "TRIP_UNAVAILABLE", 404);
    if (trip.departAt.getTime() <= Date.now() + 30 * 60 * 1000) return fail("Bron jo'nashdan 30 daqiqa oldin yopiladi", "BOOKING_CLOSED", 409);
    const validSeats = new Set(trip.busId.layout.cells.filter((cell) => cell.kind === "seat").map((cell) => cell.seatNumber));
    if (seatNumbers.some((seat) => !validSeats.has(seat))) return fail("Tanlangan o'rindiq ushbu avtobusda yo'q", "INVALID_SEAT", 422);

    const bookingId = new mongoose.Types.ObjectId();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const code = `BT-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(3).toString("hex").toUpperCase()}`;
    await session.withTransaction(async () => {
      await SeatLock.deleteMany({
        tripId, seatNumber: { $in: seatNumbers }, status: "pending", expiresAt: { $lte: new Date() }
      }, { session });
      await Booking.create([{
        _id: bookingId,
        code,
        userId: auth.user._id,
        tripId,
        passengers: passengers.map((passenger, index) => ({
          seatNumber: seatNumbers[index],
          fullName: String(passenger.fullName).trim(),
          gender: passenger.gender,
          phone: String(passenger.phone).replace(/[^\d+]/g, ""),
          document: passenger.document ? String(passenger.document).trim() : undefined
        })),
        totalPrice: trip.price * passengers.length,
        status: "pending",
        expiresAt
      }], { session });
      await SeatLock.insertMany(seatNumbers.map((seatNumber) => ({
        tripId, seatNumber, bookingId, status: "pending", expiresAt
      })), { session, ordered: true });
    });
    emitTripEvent(tripId, "seat:locked", { seatNumbers, expiresAt });
    return ok({ bookingId: String(bookingId), code, totalPrice: trip.price * passengers.length, expiresAt }, 201);
  } catch (error) {
    return errorResponse(error);
  } finally {
    await session.endSession();
  }
}

export async function GET(request) {
  const auth = await authenticate(request);
  if (auth.error) return fail(auth.error, "UNAUTHORIZED", auth.status);
  try {
    await connectDb();
    const bookings = await Booking.find({ userId: auth.user._id })
      .sort({ createdAt: -1 }).limit(50)
      .populate({ path: "tripId", populate: { path: "routeId", populate: [{ path: "fromCityId", select: "name" }, { path: "toCityId", select: "name" }] } })
      .lean();
    const ids = bookings.map((booking) => booking._id);
    const tickets = await Ticket.find({ bookingId: { $in: ids } }).select("bookingId seatNumber ticketNumber status").lean();
    const ticketMap = new Map(tickets.map((ticket) => [`${ticket.bookingId}:${ticket.seatNumber}`, ticket]));
    return ok(bookings.map((booking) => ({
      id: String(booking._id), code: booking.code, status: booking.status,
      totalPrice: booking.totalPrice, expiresAt: booking.expiresAt, createdAt: booking.createdAt,
      from: booking.tripId?.routeId?.fromCityId?.name,
      to: booking.tripId?.routeId?.toCityId?.name,
      departAt: booking.tripId?.departAt,
      passengers: booking.passengers,
      tickets: booking.passengers.flatMap((passenger) => {
        const ticket = ticketMap.get(`${booking._id}:${passenger.seatNumber}`);
        return ticket ? [{ ticketNumber: ticket.ticketNumber, seatNumber: ticket.seatNumber, status: ticket.status }] : [];
      })
    })));
  } catch (error) {
    return errorResponse(error);
  }
}
