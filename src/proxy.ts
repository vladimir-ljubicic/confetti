import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin-token";
import { env } from "@/lib/env";

// Backstop so admin routes added without their own isAdmin() check still fail
// closed. Bare /admin is excluded — it hosts the passcode form.
export function proxy(request: NextRequest) {
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (verifyAdminToken(env.adminPasscode(), token, Date.now())) {
    return NextResponse.next();
  }
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  return NextResponse.redirect(new URL("/admin", request.url));
}

export const config = {
  matcher: ["/admin/:path+", "/api/admin/:path*"],
};
