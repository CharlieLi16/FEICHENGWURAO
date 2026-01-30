import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "admin_auth";

// Routes that require admin authentication
const PROTECTED_ROUTES = ["/admin", "/event", "/stage", "/director", "/guest"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the path requires protection (except /admin/login)
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname.startsWith(route)
  );
  const isLoginPage = pathname === "/admin/login";

  if (isProtectedRoute && !isLoginPage) {
    const token = request.cookies.get(COOKIE_NAME);

    if (!token) {
      // Redirect to login page
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // If logged in and trying to access login page, redirect to admin
  if (isLoginPage) {
    const token = request.cookies.get(COOKIE_NAME);
    if (token) {
      const adminUrl = new URL("/admin", request.url);
      return NextResponse.redirect(adminUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/event/:path*", "/stage/:path*", "/director/:path*", "/guest/:path*"],
};
