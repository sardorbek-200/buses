const { authenticate } = require("@/lib/auth");
const { ok, fail } = require("@/lib/http");

export async function GET(request) {
  const auth = await authenticate(request);
  if (auth.error) return fail(auth.error, "UNAUTHORIZED", auth.status);
  return ok({
    id: String(auth.user._id),
    name: auth.user.name,
    phone: auth.user.phone,
    role: auth.user.role,
    operatorId: auth.user.operatorId ? String(auth.user.operatorId) : undefined
  });
}
