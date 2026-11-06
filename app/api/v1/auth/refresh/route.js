const jwt = require("jsonwebtoken");
const connectDb = require("@/lib/db");
const { User } = require("@/lib/models");
const { makeTokens, requiredSecret } = require("@/lib/auth");
const { ok, fail, errorResponse, setAuthCookies } = require("@/lib/http");

export async function POST(request) {
  try {
    await connectDb();
    const token = request.cookies.get("refresh_token")?.value;
    if (!token) return fail("Refresh token topilmadi", "UNAUTHORIZED", 401);
    const payload = jwt.verify(token, requiredSecret("JWT_REFRESH_SECRET"));
    if (payload.type !== "refresh") return fail("Token turi noto'g'ri", "UNAUTHORIZED", 401);
    const user = await User.findById(payload.sub);
    if (!user || !user.isPhoneVerified) return fail("Foydalanuvchi topilmadi", "UNAUTHORIZED", 401);
    const response = ok({ refreshed: true });
    return setAuthCookies(response, makeTokens(user));
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return fail("Refresh token yaroqsiz yoki muddati tugagan", "UNAUTHORIZED", 401);
    }
    return errorResponse(error);
  }
}
