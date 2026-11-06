const connectDb = require("@/lib/db");
const { City } = require("@/lib/models");
const { ok, errorResponse } = require("@/lib/http");

export async function GET(request) {
  try {
    await connectDb();
    const search = request.nextUrl.searchParams.get("search") || "";
    const cities = await City.find(search ? { name: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } } : {})
      .sort({ name: 1 }).limit(20).select("name region slug").lean();
    return ok(cities);
  } catch (error) {
    return errorResponse(error);
  }
}
