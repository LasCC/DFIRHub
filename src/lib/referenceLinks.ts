export interface ReferenceLink {
  url: string;
  host: string;
  detail: string;
}

const WWW_PREFIX = /^www\./u;
const ROOT_PATH = /^\/$/u;

export function parseReferenceLink(
  url: string,
  label?: string | null
): ReferenceLink {
  try {
    const parsed = new URL(url);
    return {
      detail: label ?? `${parsed.pathname}${parsed.search}`.replace(ROOT_PATH, ""),
      host: parsed.hostname.replace(WWW_PREFIX, ""),
      url,
    };
  } catch {
    return { detail: label ?? "", host: url, url };
  }
}
