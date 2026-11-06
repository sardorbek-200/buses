const bcrypt = require("bcryptjs");
const connectDb = require("@/lib/db");
const { User } = require("@/lib/models");
const { makeTokens } = require("@/lib/auth");
const { ok, fail, errorResponse, setAuthCookies } = require("@/lib/http");
const { checkRateLimit } = require("@/lib/rate-limit");

export async function POST(request) {
  try {
    await connectDb();
    const body = await request.json();
    const phone = String(body.phone || "").replace(/[^\d+]/g, "");
    const limit = await checkRateLimit(request, "auth-login", 8, 15 * 60 * 1000, phone);
    if (!limit.allowed) return fail("Urinishlar chegarasi oshdi. Keyinroq urinib ko'ring", "RATE_LIMITED", 429);
    const user = await User.findOne({ phone });
    if (!user || !(await bcrypt.compare(String(body.password || ""), user.passwordHash))) {
      return fail("Telefon yoki parol noto'g'ri", "INVALID_CREDENTIALS", 401);
    }
    if (!user.isPhoneVerified) return fail("Avval telefon raqamingizni tasdiqlang", "PHONE_NOT_VERIFIED", 403);
    const response = ok({ user: { id: String(user._id), name: user.name, role: user.role } });
    return setAuthCookies(response, makeTokens(user));
  } catch (error) {
    return errorResponse(error);
  }
}
