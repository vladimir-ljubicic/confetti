export const DISPLAY_NAME_MAX_LENGTH = 80;

export type Visibility = "public" | "private";

export type ProfileRequest = {
  displayName: string;
  defaultVisibility: Visibility;
};

export function parseVisibility(value: unknown): Visibility | null {
  return value === "public" || value === "private" ? value : null;
}

export function parseVisibilityField(
  body: unknown,
  key: "visibility" | "defaultVisibility",
): Visibility | null {
  if (typeof body !== "object" || body === null) return null;
  return parseVisibility((body as Record<string, unknown>)[key]);
}

export function parseDisplayNameField(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const { displayName } = body as Record<string, unknown>;
  if (typeof displayName !== "string") return null;
  const trimmed = displayName.trim();
  if (trimmed.length === 0 || trimmed.length > DISPLAY_NAME_MAX_LENGTH) return null;
  return trimmed;
}

export type UploaderPatch = {
  displayName?: string;
  uploadsBlocked?: boolean;
};

export function parseUploaderPatch(body: unknown): UploaderPatch | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;
  const patch: UploaderPatch = {};
  if ("displayName" in record) {
    const displayName = parseDisplayNameField(body);
    if (!displayName) return null;
    patch.displayName = displayName;
  }
  if ("uploadsBlocked" in record) {
    if (typeof record.uploadsBlocked !== "boolean") return null;
    patch.uploadsBlocked = record.uploadsBlocked;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}

export function parseProfileRequest(body: unknown): ProfileRequest | null {
  const displayName = parseDisplayNameField(body);
  if (!displayName) return null;
  const visibility = parseVisibilityField(body, "defaultVisibility");
  if (!visibility) return null;
  return { displayName, defaultVisibility: visibility };
}
