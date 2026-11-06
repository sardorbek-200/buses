const connectDb = require("@/lib/db");
const { authenticate } = require("@/lib/auth");
const { Operator } = require("@/lib/models");
const { ok, fail, errorResponse } = require("@/lib/http");

export async function GET(request) {
  const auth = await authenticate(request, ["admin"]);
  if (auth.error) return fail(auth.error, "UNAUTHORIZED", auth.status);
  try {
    await connectDb();
    return ok(await Operator.find().sort({ createdAt: -1 }).lean());
  } catch (error) {
    return errorResponse(error);
  }
}
