const connectDb = require("@/lib/db");
const { authenticate } = require("@/lib/auth");
const { Bus } = require("@/lib/models");
const { ok, fail, errorResponse } = require("@/lib/http");

export async function GET(request) {
  const auth = await authenticate(request, ["operator", "admin"]);
  if (auth.error) return fail(auth.error, "UNAUTHORIZED", auth.status);
  try {
    await connectDb();
    const filter = auth.user.role === "admin" ? {} : { operatorId: auth.user.operatorId };
    return ok(await Bus.find(filter).sort({ createdAt: -1 }).lean());
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request) {
  const auth = await authenticate(request, ["operator", "admin"]);
  if (auth.error) return fail(auth.error, "UNAUTHORIZED", auth.status);
  try {
    const body = await request.json();
    const cells = Array.isArray(body.layout?.cells) ? body.layout.cells : [];
    const seats = cells.filter((cell) => cell.kind === "seat");
    const seatNumbers = seats.map((seat) => String(seat.seatNumber || ""));
    if (!body.plateNumber || !body.model || !seats.length ||
      new Set(seatNumbers).size !== seatNumbers.length || seatNumbers.some((seat) => !seat)) {
      return fail("Avtobus yoki o'rindiq sxemasi noto'g'ri", "VALIDATION_ERROR", 422);
    }
    if (!auth.user.operatorId && auth.user.role !== "admin") return fail("Operator profili biriktirilmagan", "OPERATOR_REQUIRED", 403);
    await connectDb();
    const bus = await Bus.create({
      operatorId: auth.user.operatorId || body.operatorId,
      plateNumber: String(body.plateNumber).trim().toUpperCase(),
      model: String(body.model).trim(),
      type: ["standard", "comfort", "vip"].includes(body.type) ? body.type : "standard",
      layout: body.layout,
      seatCount: seats.length
    });
    return ok(bus, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
