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
    const limit = await checkRateLimit(request, "auth-forgot-password", 3, 60 * 60 * 1000, phone);
    if (!limit.allowed) return fail("So'rovlar chegarasi oshdi. Keyinroq urinib ko'ring", "RATE_LIMITED", 429);
    const user = await User.findOne({ phone });
    if (!user) return fail("Foydalanuvchi topilmadi", "USER_NOT_FOUND", 404);
    if (process.env.NODE_ENV === "production") {
      return fail("SMS provayder ulanmagan", "SMS_UNAVAILABLE", 503);
    }
    const code = process.env.OTP_TEST_CODE || "1111";
    user.otpCode = await bcrypt.hash(code, 10);
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    return ok({ otpRequired: true, phone });
  } catch (error) {
    return errorResponse(error);
  }
}
