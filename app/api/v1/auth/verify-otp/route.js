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
    const code = String(body.code || "");
    const limit = await checkRateLimit(request, "auth-verify-otp", 5, 15 * 60 * 1000, phone);
    if (!limit.allowed) return fail("Urinishlar chegarasi oshdi. 15 daqiqadan keyin urinib ko'ring", "RATE_LIMITED", 429);
    const user = await User.findOne({ phone });
    if (!user || !user.otpCode || !user.otpExpiresAt || user.otpExpiresAt < new Date() ||
      !(await bcrypt.compare(code, user.otpCode))) {
      return fail("Tasdiqlash kodi noto'g'ri yoki muddati tugagan", "INVALID_OTP", 400);
    }
    user.isPhoneVerified = true;
    user.otpCode = undefined;
    user.otpExpiresAt = undefined;
    await user.save();
    const response = ok({ user: { id: String(user._id), name: user.name, role: user.role } });
    return setAuthCookies(response, makeTokens(user));
  } catch (error) {
    return errorResponse(error);
  }
}
