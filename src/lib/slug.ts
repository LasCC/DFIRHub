const SLUG_INVALID_PATTERN = /[^a-z0-9]+/gu;
const SLUG_EDGE_PATTERN = /^-|-$/gu;

export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .replaceAll(SLUG_INVALID_PATTERN, "-")
    .replaceAll(SLUG_EDGE_PATTERN, "");
}
