const bcrypt = require("bcryptjs");
const connectDb = require("@/lib/db");
const { User } = require("@/lib/models");
const { ok, fail, errorResponse } = require("@/lib/http");
const { checkRateLimit } = require("@/lib/rate-limit");

export async function POST(request) {
  try {
    await connectDb();
    const body = await request.json();
    const phone = String(body.phone || "").replace(/[^\d+]/g, "");
    const code = String(body.code || "");
    const password = String(body.password || "");
    const limit = await checkRateLimit(request, "auth-reset-password", 5, 15 * 60 * 1000, phone);
    if (!limit.allowed) return fail("Urinishlar chegarasi oshdi. 15 daqiqadan keyin urinib ko'ring", "RATE_LIMITED", 429);
    if (password.length < 8) return fail("Parol kamida 8 ta belgidan iborat bo'lishi kerak", "VALIDATION_ERROR", 422);
    const user = await User.findOne({ phone });
    if (!user || !user.otpCode || !user.otpExpiresAt || user.otpExpiresAt < new Date() ||
      !(await bcrypt.compare(code, user.otpCode))) {
      return fail("Tasdiqlash kodi noto'g'ri yoki muddati tugagan", "INVALID_OTP", 400);
    }
    user.passwordHash = await bcrypt.hash(password, 12);
    user.otpCode = undefined;
    user.otpExpiresAt = undefined;
    await user.save();
    return ok({ passwordChanged: true });
  } catch (error) {
    return errorResponse(error);
  }
}
