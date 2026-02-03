import LZString from "lz-string";

export interface ShareState {
  rule: string;
  backend: string;
  pipeline?: string;
  customPipeline?: string;
}

export function encodeShareState(state: ShareState): string {
  const json = JSON.stringify(state);
  return LZString.compressToEncodedURIComponent(json);
}

export function decodeShareState(hash: string): ShareState | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(hash);
    if (!json) return null;
    return JSON.parse(json) as ShareState;
  } catch {
    return null;
  }
}
