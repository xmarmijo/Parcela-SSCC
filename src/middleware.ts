import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const user = req.auth?.user;
  const role = user?.role;
  const pathname = nextUrl.pathname;

  // Protect /admin routes (ADMIN only)
  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", nextUrl.origin));
    }
  }

  // Protect /reservar and /mis-reservas routes (authenticated users only)
  if (
    pathname.startsWith("/reservar") ||
    pathname.startsWith("/reservas") ||
    pathname.startsWith("/mis-reservas") ||
    pathname.startsWith("/familia")
  ) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/reservar/:path*",
    "/reservas/:path*",
    "/mis-reservas/:path*",
    "/familia/:path*",
    "/admin/:path*",
  ],
};
