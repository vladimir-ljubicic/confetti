// Chrome caps cookie lifetime at 400 days.
export const LONG_LIVED_COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

export function longLivedHttpOnlyCookie() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: LONG_LIVED_COOKIE_MAX_AGE_SECONDS,
  } as const;
}
