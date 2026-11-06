const { NextResponse } = require("next/server");

function ok(data, status = 200, meta) {
  return NextResponse.json({ success: true, data, ...(meta ? { meta } : {}) }, { status });
}

function fail(message, code = "BAD_REQUEST", status = 400) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

function errorResponse(error) {
  if (error?.code === 11000) return fail("Bu joy yoki ma'lumot avval band qilingan", "CONFLICT", 409);
  if (error?.name === "ValidationError") return fail("Kiritilgan ma'lumotlarni tekshiring", "VALIDATION_ERROR", 422);
  console.error(error);
  return fail("Serverda kutilmagan xatolik yuz berdi", "INTERNAL_ERROR", 500);
}

function setAuthCookies(response, tokens) {
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set("access_token", tokens.accessToken, {
    httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 15 * 60
  });
  response.cookies.set("refresh_token", tokens.refreshToken, {
    httpOnly: true, secure, sameSite: "lax", path: "/api/v1/auth", maxAge: 7 * 24 * 60 * 60
  });
  return response;
}

module.exports = { ok, fail, errorResponse, setAuthCookies };
