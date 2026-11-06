const mongoose = require("mongoose");
const connectDb = require("@/lib/db");
const { authenticate } = require("@/lib/auth");
const { Operator, AuditLog } = require("@/lib/models");
const { ok, fail, errorResponse } = require("@/lib/http");

export async function POST(request, context) {
  const auth = await authenticate(request, ["admin"]);
  if (auth.error) return fail(auth.error, "UNAUTHORIZED", auth.status);
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const status = body.status === "blocked" ? "blocked" : "active";
    if (!mongoose.isValidObjectId(id)) return fail("Operator topilmadi", "NOT_FOUND", 404);
    await connectDb();
    const operator = await Operator.findByIdAndUpdate(id, { $set: { status } }, { new: true });
    if (!operator) return fail("Operator topilmadi", "NOT_FOUND", 404);
    await AuditLog.create({
      userId: auth.user._id, action: `operator.${status}`, entity: "Operator",
      entityId: String(operator._id), meta: { status }
    });
    return ok(operator);
  } catch (error) {
    return errorResponse(error);
  }
}
