const bcrypt = require("bcryptjs");
const connectDb = require("@/lib/db");
const { User } = require("@/lib/models");
const { ok, fail, errorResponse } = require("@/lib/http");
const { checkRateLimit } = require("@/lib/rate-limit");

function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d+]/g, "");
}

async function sendOtp(phone) {
  if (process.env.NODE_ENV === "production") {
    console.error(`OTP delivery is not configured for ${phone}`);
    throw new Error("SMS_PROVIDER_NOT_CONFIGURED");
  }
  return process.env.OTP_TEST_CODE || "1111";
}

export async function POST(request) {
  try {
    await connectDb();
    const body = await request.json();
    const name = String(body.name || "").trim();
    const phone = normalizePhone(body.phone);
    const limit = await checkRateLimit(request, "auth-register", 5, 60 * 60 * 1000, phone);
    if (!limit.allowed) return fail("Urinishlar chegarasi oshdi. Keyinroq urinib ko'ring", "RATE_LIMITED", 429);
    const password = String(body.password || "");
    if (name.length < 2 || name.length > 120 || !/^\+?\d{9,15}$/.test(phone) || password.length < 8) {
      return fail("Ism, telefon yoki parol formati noto'g'ri", "VALIDATION_ERROR", 422);
    }
    if (await User.exists({ phone })) return fail("Bu telefon raqam ro'yxatdan o'tgan", "PHONE_EXISTS", 409);
    const otpCode = await sendOtp(phone);
    const user = await User.create({
      name, phone, passwordHash: await bcrypt.hash(password, 12),
      otpCode: await bcrypt.hash(otpCode, 10),
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });
    return ok({ userId: String(user._id), phone, otpRequired: true }, 201);
  } catch (error) {
    if (error.message === "SMS_PROVIDER_NOT_CONFIGURED") {
      return fail("SMS provayder ulanmagan. Ro'yxatdan o'tish vaqtincha mavjud emas", "SMS_UNAVAILABLE", 503);
    }
    return errorResponse(error);
  }
}
