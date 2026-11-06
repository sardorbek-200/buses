import { NextResponse } from "next/server";

const protectedRoles = [
  { prefix: "/dashboard", roles: ["passenger", "operator", "controller", "admin"] },
  { prefix: "/operator", roles: ["operator", "admin"] },
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/controller", roles: ["controller", "admin"] },
  { prefix: "/my-tickets", roles: ["passenger", "operator", "controller", "admin"] }
];

function decodeBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function verifyAccessToken(token, secret) {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) return null;
  const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedHeader)));
  const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedPayload)));
  if (header.alg !== "HS256" || typeof payload.sub !== "string" ||
    typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now() / 1000)) return null;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
  );
  const valid = await crypto.subtle.verify(
    "HMAC", key, decodeBase64Url(encodedSignature), new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
  );
  return valid ? payload : null;
}

export async function middleware(request) {
  const path = request.nextUrl.pathname;
  const restriction = protectedRoles.find(({ prefix }) => path.startsWith(prefix));
  if (!restriction) return NextResponse.next();
  const token = request.cookies.get("access_token")?.value;
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!token || !secret || secret.length < 32) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  try {
    const payload = await verifyAccessToken(token, secret);
    if (!payload || !restriction.roles.includes(String(payload.role))) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/operator/:path*", "/admin/:path*", "/controller/:path*", "/my-tickets/:path*"]
};
