/**
 * Default font for Thai text. มะขาม 16 (`makham-16`) is the main Thai font. มะขาม 12 stays available by id
 * (`--font makham-12`) for projects that already use it; it is the fallback when a workspace has no makham-16.
 */
export const DEFAULT_FONT_ID = "makham-16";
export const DEFAULT_FONT_FALLBACKS = ["makham-16", "makham-12"] as const;

/** Pick the default font id from the ids in a workspace. */
export function pickDefaultFont(ids: readonly string[]): string {
  for (const id of DEFAULT_FONT_FALLBACKS) if (ids.includes(id)) return id;
  return ids[0] ?? DEFAULT_FONT_ID;
}
