declare module "bidi-js" {
  type EmbeddingLevels = { levels: Uint8Array; paragraphs: { start: number; end: number; level: number }[] };
  type Bidi = {
    getEmbeddingLevels(text: string, direction?: "ltr" | "rtl" | "auto"): EmbeddingLevels;
    /** Map of string index → mirrored character, for the characters at odd (right-to-left) levels. */
    getMirroredCharactersMap(text: string, levels: Uint8Array, start?: number, end?: number): Map<number, string>;
    getMirroredCharacter(char: string): string | null;
    getReorderSegments(text: string, levels: EmbeddingLevels, start?: number, end?: number): [number, number][];
  };
  export default function bidiFactory(): Bidi;
}
