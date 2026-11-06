const { ok } = require("@/lib/http");
const { NextResponse } = require("next/server");
const mongoose = require("mongoose");

export async function GET() {
  if (mongoose.connection.readyState !== 1) {
    return NextResponse.json({ success: false, error: { code: "DATABASE_UNAVAILABLE", message: "Ma'lumotlar bazasi ulanmagan" } }, { status: 503 });
  }
  return ok({ status: "ok", service: "busticket", time: new Date().toISOString() });
}
