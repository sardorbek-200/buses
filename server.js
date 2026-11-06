require("dotenv").config();
const { createServer } = require("node:http");
const next = require("next");
const { Server } = require("socket.io");
const cron = require("node-cron");
const connectDb = require("./lib/db");
const { Booking, SeatLock, Trip } = require("./lib/models");
const { requiredSecret } = require("./lib/auth");

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3009);
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  requiredSecret("JWT_ACCESS_SECRET");
  requiredSecret("JWT_REFRESH_SECRET");
  requiredSecret("QR_HMAC_SECRET");
  await connectDb();
  const httpServer = createServer((req, res) => handle(req, res));
  const io = new Server(httpServer, {
    cors: { origin: process.env.SITE_URL || `http://localhost:${port}`, credentials: true }
  });
  global.io = io;

  io.on("connection", (socket) => {
    socket.on("trip:join", (tripId) => {
      if (typeof tripId === "string" && /^[a-f\d]{24}$/i.test(tripId)) {
        socket.join(`trip:${tripId}`);
      }
    });
    socket.on("trip:leave", (tripId) => socket.leave(`trip:${tripId}`));
  });

  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const expired = await Booking.find({ status: "pending", expiresAt: { $lte: now } })
        .select("_id tripId")
        .lean();
      if (expired.length) {
        const ids = expired.map((booking) => booking._id);
        await Booking.updateMany({ _id: { $in: ids }, status: "pending" }, { $set: { status: "expired" } });
        await SeatLock.deleteMany({ bookingId: { $in: ids }, status: "pending" });
        for (const booking of expired) {
          io.to(`trip:${booking.tripId}`).emit("seat:released", { bookingId: String(booking._id) });
        }
      }
      await SeatLock.deleteMany({ status: "pending", expiresAt: { $lte: now } });
      await Trip.updateMany(
        { status: { $in: ["scheduled", "boarding"] }, departAt: { $lte: now } },
        { $set: { status: "departed" } }
      );
      await Trip.updateMany(
        { status: "departed", arriveAt: { $lte: now } },
        { $set: { status: "completed" } }
      );
      await Trip.updateMany(
        { status: "scheduled", departAt: { $gt: now, $lte: new Date(now.getTime() + 30 * 60 * 1000) } },
        { $set: { status: "boarding" } }
      );
    } catch (error) {
      console.error("Background booking/trip status update failed:", error);
    }
  });

  httpServer.listen(port, "127.0.0.1", () => {
    console.log(`BusTicket listening on http://127.0.0.1:${port}`);
  });
});
