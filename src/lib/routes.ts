export const HOME_PATH = "/";
export const ARTIFACTS_PATH = "/artifacts";
export const COLLECTIONS_PATH = "/collections";
export const REGISTRY_INDEX_PATH = "/registry";
export const EVENTLOG_INDEX_PATH = "/eventlogs";
export const BUILDER_PATH = "/builder";
export const CONVERTER_PATH = "/converter";
export const CATEGORY_QUERY_PARAM = "category";
export const SEARCH_QUERY_PARAM = "q";

const HTML_EXTENSION = /\.html$/u;

export function artifactPath(slug: string): string {
  return `/artifact/${slug}`;
}

export function categoryPath(category: string): string {
  return `/category/${category.toLowerCase()}`;
}

export function registryPath(slug: string): string {
  return `${REGISTRY_INDEX_PATH}/${slug}`;
}

export function eventLogPath(slug: string): string {
  return `${EVENTLOG_INDEX_PATH}/${slug}`;
}

export function filteredListPath(listPath: string, categoryId: string): string {
  return `${listPath}?${CATEGORY_QUERY_PARAM}=${encodeURIComponent(categoryId)}`;
}

export function searchListPath(listPath: string, query: string): string {
  return `${listPath}?${SEARCH_QUERY_PARAM}=${encodeURIComponent(query)}`;
}

export function artifactOgImagePath(slug: string): string {
  return `/og/${slug}.png`;
}

export function registryOgImagePath(slug: string): string {
  return `/og/registry/${slug}.png`;
}

export function eventLogOgImagePath(slug: string): string {
  return `/og/eventlogs/${slug}.png`;
}

export function stripHtmlExtension(pathname: string): string {
  return pathname.replace(HTML_EXTENSION, "");
}
