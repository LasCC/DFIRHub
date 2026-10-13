const DEFAULT_SOURCE_DRIVE = "C:";
const DEFAULT_DESTINATION = "D:\\Evidence";

export const BROWSE_ALL_VALUE = "browse-all-results";

export const SUGGESTED_QUERIES = [
  "prefetch",
  "amcache",
  "srum",
  "chrome",
  "eventlogs",
] as const;

export const buildKapeCommand = (targetName: string): string =>
  `kape.exe --tsource ${DEFAULT_SOURCE_DRIVE} --tdest ${DEFAULT_DESTINATION} --target ${targetName}`;
