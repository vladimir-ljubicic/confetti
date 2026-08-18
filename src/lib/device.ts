import "server-only";
import { cookies } from "next/headers";
import { longLivedHttpOnlyCookie } from "./cookies";

const DEVICE_COOKIE = "confetti_device";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getDeviceId(): Promise<string | null> {
  const value = (await cookies()).get(DEVICE_COOKIE)?.value;
  return value && UUID_PATTERN.test(value) ? value : null;
}

// Only callable from route handlers / server functions (cookie writes are
// forbidden during server component render).
export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await getDeviceId();
  if (existing) return existing;
  const id = crypto.randomUUID();
  (await cookies()).set(DEVICE_COOKIE, id, longLivedHttpOnlyCookie());
  return id;
}
