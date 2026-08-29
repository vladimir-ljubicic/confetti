import { describe, expect, it } from "vitest";
import {
  GALLERY_URL_TTL_SECONDS,
  GALLERY_URL_WINDOW_SECONDS,
  signingWindow,
  THUMB_MAX_AGE_SECONDS,
} from "./photo-url-window";

const seconds = (value: number) => value * 1000;

describe("signingWindow", () => {
  it("holds still for the length of a window", () => {
    expect(signingWindow(seconds(GALLERY_URL_WINDOW_SECONDS - 1))).toBe(
      signingWindow(0),
    );
  });

  it("moves on once a window has passed", () => {
    expect(signingWindow(seconds(GALLERY_URL_WINDOW_SECONDS))).toBe(
      signingWindow(0) + 1,
    );
  });

  it("moves on again every window after that", () => {
    expect(signingWindow(seconds(GALLERY_URL_WINDOW_SECONDS * 7))).toBe(
      signingWindow(0) + 7,
    );
  });
});

describe("the durations a rendered photo depends on", () => {
  it("leaves a signed URL valid for as long as it can still be followed", () => {
    // The longest a URL is in use: minted at the start of a window, handed to a
    // browser at the end of it, then followed from that browser's redirect
    // cache a whole max-age later.
    expect(GALLERY_URL_WINDOW_SECONDS + THUMB_MAX_AGE_SECONDS).toBeLessThan(
      GALLERY_URL_TTL_SECONDS,
    );
  });
});
