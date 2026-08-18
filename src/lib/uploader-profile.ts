export const DISPLAY_NAME_MAX_LENGTH = 80;

export type Visibility = "public" | "private";

export type ProfileRequest = {
  displayName: string;
  defaultVisibility: Visibility;
};

export function parseProfileRequest(body: unknown): ProfileRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const { displayName, defaultVisibility } = body as Record<string, unknown>;
  if (typeof displayName !== "string") return null;
  const trimmed = displayName.trim();
  if (trimmed.length === 0 || trimmed.length > DISPLAY_NAME_MAX_LENGTH) return null;
  if (defaultVisibility !== "public" && defaultVisibility !== "private") return null;
  return { displayName: trimmed, defaultVisibility };
}
