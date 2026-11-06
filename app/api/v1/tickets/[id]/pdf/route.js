const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const { createHmac } = require("node:crypto");
const connectDb = require("@/lib/db");
const { authenticate, requiredSecret } = require("@/lib/auth");
const { Ticket, Booking } = require("@/lib/models");
const { fail, errorResponse } = require("@/lib/http");

export const runtime = "nodejs";

export async function GET(request, context) {
  const auth = await authenticate(request);
  if (auth.error) return fail(auth.error, "UNAUTHORIZED", auth.status);
  try {
    const { id } = await context.params;
    if (!mongoose.isValidObjectId(id)) return fail("Chipta topilmadi", "NOT_FOUND", 404);
    await connectDb();
    const ticket = await Ticket.findById(id).lean();
    if (!ticket) return fail("Chipta topilmadi", "NOT_FOUND", 404);
    const booking = await Booking.findById(ticket.bookingId)
      .populate({ path: "tripId", populate: { path: "routeId", populate: [{ path: "fromCityId", select: "name" }, { path: "toCityId", select: "name" }] } }).lean();
    if (!booking || (auth.user.role === "passenger" && String(booking.userId) !== String(auth.user._id))) {
      return fail("Chipta topilmadi", "NOT_FOUND", 404);
    }
    const qr = `${ticket._id}.${createHmac("sha256", requiredSecret("QR_HMAC_SECRET")).update(String(ticket._id)).digest("hex")}`;
    const qrImage = await QRCode.toDataURL(qr, { margin: 1, width: 220 });
    const doc = new PDFDocument({ size: "A5", margin: 38 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    const completed = new Promise((resolve, reject) => {
      doc.on("end", resolve);
      doc.on("error", reject);
    });
    doc.fontSize(22).fillColor("#1e3a8a").text("BUS TICKET", { align: "center" });
    doc.moveDown().fontSize(13).fillColor("#111827").text(`Chipta: ${ticket.ticketNumber}`);
    doc.text(`Yo'nalish: ${booking.tripId.routeId.fromCityId.name} - ${booking.tripId.routeId.toCityId.name}`);
    doc.text(`Jo'nash: ${new Date(booking.tripId.departAt).toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })}`);
    doc.text(`O'rindiq: ${ticket.seatNumber}`);
    doc.text(`Bron: ${booking.code}`);
    doc.image(Buffer.from(qrImage.split(",")[1], "base64"), 150, 210, { width: 180 });
    doc.end();
    await completed;
    return new Response(Buffer.concat(chunks), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${ticket.ticketNumber}.pdf"`,
        "Cache-Control": "private, no-store"
      }
    });
  } catch (error) {
    return errorResponse(error);
  }
}
