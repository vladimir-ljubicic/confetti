import { describe, expect, it } from "vitest";
import {
  failureDetail,
  failureReason,
  formatPhotoSize,
  groupFailures,
  splitRetryTargets,
  type BatchFailure,
} from "./batch-failures";

const detailLabels = {
  uploadedPercent: "Отпремљено {percent}%",
  maxSize: "највише {max}",
  unsupportedFormat: "Неподржан формат",
};

function failure(over: Partial<BatchFailure> = {}): BatchFailure {
  return {
    id: 1,
    previewUrl: "blob:1",
    reason: "network",
    sizeBytes: 4_100_000,
    uploadedBytes: 0,
    attempts: 1,
    ...over,
  };
}

describe("groupFailures", () => {
  it("splits the list by whether another attempt could help", () => {
    const network = failure({ id: 1, reason: "network" });
    const tooLarge = failure({ id: 2, reason: "too-large" });
    const server = failure({ id: 3, reason: "server" });
    const notAnImage = failure({ id: 4, reason: "not-an-image" });

    expect(groupFailures([network, tooLarge, server, notAnImage])).toEqual({
      retryable: [network, server],
      deadEnd: [],
      unretryable: [tooLarge, notAnImage],
    });
  });

  it("sets aside a photo that has failed three times", () => {
    const fresh = failure({ id: 1, attempts: 2 });
    const spent = failure({ id: 2, attempts: 3 });

    expect(groupFailures([fresh, spent])).toEqual({
      retryable: [fresh],
      deadEnd: [spent],
      unretryable: [],
    });
  });

  it("leaves a photo we cannot upload out of the dead end, however many attempts", () => {
    const tooLarge = failure({ reason: "too-large", attempts: 5 });
    expect(groupFailures([tooLarge])).toEqual({
      retryable: [],
      deadEnd: [],
      unretryable: [tooLarge],
    });
  });

  it("keeps the order the failures came in", () => {
    const first = failure({ id: 1, reason: "server" });
    const second = failure({ id: 2, reason: "network" });
    expect(groupFailures([first, second]).retryable).toEqual([first, second]);
  });

  it("carries whatever else the caller attached to a failure", () => {
    const entry = { ...failure(), file: "photo.jpg" };
    expect(groupFailures([entry]).retryable[0].file).toBe("photo.jpg");
  });

  it("handles an empty list", () => {
    expect(groupFailures([])).toEqual({
      retryable: [],
      deadEnd: [],
      unretryable: [],
    });
  });
});

describe("failureReason", () => {
  const reasonLabels = {
    reason: {
      network: "Веза је прекинута",
      server: "Сервер није одговорио",
      "too-large": "Превелика датотека",
      "not-an-image": "Није фотографија",
    },
    attempts: {
      one: "{count} проба",
      few: "{count} пробе",
      many: "{count} проба",
    },
  };

  it("names the reason alone after the first attempt", () => {
    expect(
      failureReason(
        failure({ reason: "server", attempts: 1 }),
        reasonLabels,
        "sr",
      ),
    ).toBe("Сервер није одговорио");
  });

  it("carries the attempt count once a photo has been tried again", () => {
    expect(
      failureReason(
        failure({ reason: "server", attempts: 3 }),
        reasonLabels,
        "sr",
      ),
    ).toBe("Сервер није одговорио · 3 пробе");
  });

  it("pluralizes the attempt count", () => {
    expect(
      failureReason(
        failure({ reason: "network", attempts: 5 }),
        reasonLabels,
        "sr",
      ),
    ).toBe("Веза је прекинута · 5 проба");
  });
});

describe("formatPhotoSize", () => {
  it("keeps one decimal below ten megabytes", () => {
    expect(formatPhotoSize(4_100_000, "en")).toBe("4.1 MB");
    expect(formatPhotoSize(4_100_000, "sr")).toBe("4,1 MB");
  });

  it("rounds to whole megabytes from ten up", () => {
    expect(formatPhotoSize(62_400_000, "en")).toBe("62 MB");
  });

  it("drops to kilobytes for a photo under a megabyte", () => {
    expect(formatPhotoSize(512_000, "en")).toBe("512 KB");
    expect(formatPhotoSize(400, "en")).toBe("1 KB");
  });
});

describe("failureDetail", () => {
  it("states how far a partly uploaded photo got, and its size", () => {
    expect(
      failureDetail(
        failure({ sizeBytes: 4_100_000, uploadedBytes: 2_460_000 }),
        detailLabels,
        "sr",
        null,
      ),
    ).toBe("Отпремљено 60% · 4,1 MB");
  });

  it("states the size alone when the upload never got going", () => {
    expect(failureDetail(failure(), detailLabels, "sr", null)).toBe("4,1 MB");
  });

  it("names the limit an oversized photo went past", () => {
    expect(
      failureDetail(
        failure({ reason: "too-large", sizeBytes: 62_000_000 }),
        detailLabels,
        "en",
        40_000_000,
      ),
    ).toBe("62 MB · највише 40 MB");
  });

  it("states the size alone when the device is exempt from the limit", () => {
    expect(
      failureDetail(
        failure({ reason: "too-large", sizeBytes: 62_000_000 }),
        detailLabels,
        "en",
        null,
      ),
    ).toBe("62 MB");
  });

  it("says a file that is not a photo has an unsupported format", () => {
    expect(
      failureDetail(failure({ reason: "not-an-image" }), detailLabels, "sr", null),
    ).toBe("Неподржан формат");
  });
});

describe("splitRetryTargets", () => {
  const tile = (id: number, tileId: number | null) => ({
    ...failure({ id }),
    tileId,
  });

  it("sends a failure that still has a tile back through that tile", () => {
    const withTile = tile(1, 7);
    const fromBulk = tile(2, null);

    expect(splitRetryTargets([withTile, fromBulk])).toEqual({
      tiles: [withTile],
      files: [fromBulk],
    });
  });

  it("keeps the order the failures came in", () => {
    const first = tile(1, 7);
    const second = tile(2, 8);
    expect(splitRetryTargets([first, second]).tiles).toEqual([first, second]);
  });

  it("handles an empty list", () => {
    expect(splitRetryTargets([])).toEqual({ tiles: [], files: [] });
  });
});
