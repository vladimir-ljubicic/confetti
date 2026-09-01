import { afterEach, describe, expect, it } from "vitest";
import { photoZoomName, supportsViewTransitions } from "./view-transition";

const globals = globalThis as { document?: unknown };

afterEach(() => {
  delete globals.document;
});

describe("photoZoomName", () => {
  it("names a photo's pair by its id", () => {
    expect(photoZoomName("9f1c")).toBe("photo-9f1c");
  });

  it("keeps its prefix in front of an id that could not start a name", () => {
    expect(photoZoomName("7-e2")).toBe("photo-7-e2");
  });

  it("tells two photos apart", () => {
    expect(photoZoomName("a")).not.toBe(photoZoomName("b"));
  });
});

describe("supportsViewTransitions", () => {
  it("is false where the page is being rendered without a document", () => {
    expect(supportsViewTransitions()).toBe(false);
  });

  it("is false in a browser that cannot start one", () => {
    globals.document = {};
    expect(supportsViewTransitions()).toBe(false);
  });

  it("is true once the document can start one", () => {
    globals.document = { startViewTransition: () => undefined };
    expect(supportsViewTransitions()).toBe(true);
  });
});
