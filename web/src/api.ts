export { get, post } from "./api.base";
export interface FontSummary { id: string; name: string; th: string; size: number; line: number; baseline: number; glyphs: number; errors: number; file: string }
export interface Workspace { workspace: string; fonts: FontSummary[]; samples: { th: string[]; latin: string[] }; presets: string[] }
export interface GlyphRow { cp: number; char: string; top: number; rows: string[]; mark: boolean; dx: number; adv: number }
export interface Diag { path: string; message: string }
export interface FontData { id: string; name: string; th: string; size: number; line: number; baseline: number; zones: Record<string, number>; glyphs: GlyphRow[]; text: string; errors: Diag[]; warnings: Diag[] }
export interface Check { id: string; ok: boolean; errors: Diag[]; warnings: Diag[]; glyphs: number; forms: number; missing: string[]; stacking: Array<{ kind: string; cluster: string; message: string; text: string }>; samples: number }
