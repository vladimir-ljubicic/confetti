import { describe, expect, it } from "vitest";
import {
  backdropOpacity,
  dismissed,
  dismissProgress,
  dragAxis,
  photoScale,
} from "./swipe-dismiss";

describe("dragAxis", () => {
  it("waits until the pointer has travelled far enough to mean it", () => {
    expect(dragAxis(0, 0)).toBe("pending");
    expect(dragAxis(6, 6)).toBe("pending");
    expect(dragAxis(0, 9)).toBe("pending");
  });

  it("takes the vertical drag once it leads past the threshold", () => {
    expect(dragAxis(0, 10)).toBe("vertical");
    expect(dragAxis(0, -10)).toBe("vertical");
    expect(dragAxis(4, -12)).toBe("vertical");
  });

  it("leaves a sideways lead to the track", () => {
    expect(dragAxis(10, 0)).toBe("horizontal");
    expect(dragAxis(-12, 4)).toBe("horizontal");
    expect(dragAxis(10, 10)).toBe("horizontal");
  });
});

describe("dismissed", () => {
  it("commits past the dismiss distance in either direction", () => {
    expect(dismissed(109, 0, null)).toBe(false);
    expect(dismissed(111, 0, null)).toBe(true);
    expect(dismissed(-111, 0, null)).toBe(true);
  });

  it("commits a short flick that is quick enough", () => {
    expect(dismissed(30, 0.6, 0)).toBe(true);
    expect(dismissed(-30, -0.6, 0)).toBe(true);
    expect(dismissed(30, 0.4, 0)).toBe(false);
  });

  it("ignores a flick that has not moved far enough to be one", () => {
    expect(dismissed(10, 2, 0)).toBe(false);
  });

  it("ignores speed the finger shed before lifting", () => {
    expect(dismissed(30, 2, 200)).toBe(false);
    expect(dismissed(30, 2, null)).toBe(false);
  });

  it("ignores speed against the drag", () => {
    expect(dismissed(30, -2, 0)).toBe(false);
  });
});

describe("the drag's curves", () => {
  it("runs progress over the dismiss distance, either way", () => {
    expect(dismissProgress(0)).toBe(0);
    expect(dismissProgress(160)).toBe(0.5);
    expect(dismissProgress(-160)).toBe(0.5);
    expect(dismissProgress(400)).toBe(1);
  });

  it("shrinks the photo to its floor", () => {
    expect(photoScale(0)).toBe(1);
    expect(photoScale(1)).toBeCloseTo(0.88);
  });

  it("thins the backdrop without clearing it, so the gallery stays behind", () => {
    expect(backdropOpacity(0)).toBe(1);
    expect(backdropOpacity(1)).toBeCloseTo(0.3);
  });
});
