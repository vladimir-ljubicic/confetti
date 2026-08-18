import "server-only";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, createAdminToken, verifyAdminToken } from "./admin-token";
import { longLivedHttpOnlyCookie } from "./cookies";
import { env } from "./env";

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return verifyAdminToken(env.adminPasscode(), token, Date.now());
}

// Only callable from route handlers / server functions (cookie writes are
// forbidden during server component render).
export async function grantAdminSession(): Promise<void> {
  (await cookies()).set(
    ADMIN_COOKIE,
    createAdminToken(env.adminPasscode(), Date.now()),
    longLivedHttpOnlyCookie(),
  );
}
