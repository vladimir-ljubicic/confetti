// "Ana Marić" → "Ana M."; single-token names stay as typed.
export function shortUploaderName(displayName: string): string {
  const tokens = displayName.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "";
  if (tokens.length === 1) return tokens[0];
  return `${tokens[0]} ${tokens[tokens.length - 1][0]}.`;
}
