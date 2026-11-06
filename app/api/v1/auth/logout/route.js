const { ok } = require("@/lib/http");

export async function POST() {
  const response = ok({ loggedOut: true });
  response.cookies.set("access_token", "", { httpOnly: true, path: "/", maxAge: 0 });
  response.cookies.set("refresh_token", "", { httpOnly: true, path: "/api/v1/auth", maxAge: 0 });
  return response;
}
