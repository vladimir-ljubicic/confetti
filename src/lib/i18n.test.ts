import { describe, expect, it } from "vitest";
import { pluralize, resolveLocale } from "./i18n";

describe("resolveLocale", () => {
  it("defaults to Serbian when no value is stored", () => {
    expect(resolveLocale(undefined)).toBe("sr");
  });

  it("defaults to Serbian for unknown values", () => {
    expect(resolveLocale("fr")).toBe("sr");
    expect(resolveLocale("")).toBe("sr");
  });

  it("returns supported locales as-is", () => {
    expect(resolveLocale("sr")).toBe("sr");
    expect(resolveLocale("en")).toBe("en");
  });
});

describe("pluralize", () => {
  const forms = {
    one: "{count} фотографија отпремљена",
    few: "{count} фотографије отпремљене",
    many: "{count} фотографија отпремљено",
  };

  it("picks Serbian one/few/other forms", () => {
    expect(pluralize("sr", 1, forms)).toBe("1 фотографија отпремљена");
    expect(pluralize("sr", 21, forms)).toBe("21 фотографија отпремљена");
    expect(pluralize("sr", 3, forms)).toBe("3 фотографије отпремљене");
    expect(pluralize("sr", 97, forms)).toBe("97 фотографија отпремљено");
    expect(pluralize("sr", 12, forms)).toBe("12 фотографија отпремљено");
  });

  it("uses one/other for English", () => {
    const en = { one: "{count} photo", few: "{count} photos", many: "{count} photos" };
    expect(pluralize("en", 1, en)).toBe("1 photo");
    expect(pluralize("en", 2, en)).toBe("2 photos");
  });
});
