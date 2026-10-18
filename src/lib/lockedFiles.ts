import type { KapeTargetEntry } from "./kapefiles";

const NTFS_METAFILE =
  /(^|\\)\$(mft|mftmirr|logfile|boot|secure|j|max|bitmap|badclus|extend|usnjrnl|t|tops|txflog)(\\|:|$)/i;
const SYSTEM_HIVE_DIRECTORY = /^[a-z]:\\windows\\system32\\config\\?$/i;
const SYSTEM_HIVE_NAME =
  /^(sam|security|software|system|default|components|drivers|bbi|elam)(\.log[\d*]*|\*)?$/i;
const ALWAYS_LOCKED_FILE =
  /(ntuser\.dat|usrclass\.dat|amcache\.hve|syscache\.hve|srudb\.dat|webcachev\d*\.dat|windows\.edb|pagefile\.sys|hiberfil\.sys|swapfile\.sys|\.evtx)/i;
const LOCKED_DIRECTORY = /\\(winevt\\logs|sru)\\?$/i;

function combinedEntryPath(entry: KapeTargetEntry): string {
  const trimmedPath = entry.path.replace(/\\+$/, "");
  return entry.fileMask ? `${trimmedPath}\\${entry.fileMask}` : trimmedPath;
}

function isSystemHiveEntry(entry: KapeTargetEntry): boolean {
  if (!SYSTEM_HIVE_DIRECTORY.test(entry.path)) {
    return false;
  }
  if (!entry.fileMask) {
    return true;
  }
  return SYSTEM_HIVE_NAME.test(entry.fileMask);
}

export function isLockedOnLiveSystem(entry: KapeTargetEntry): boolean {
  const combined = combinedEntryPath(entry);
  return (
    NTFS_METAFILE.test(combined) ||
    ALWAYS_LOCKED_FILE.test(combined) ||
    LOCKED_DIRECTORY.test(entry.path) ||
    isSystemHiveEntry(entry)
  );
}

export function findLockedEntries(
  entries: KapeTargetEntry[]
): KapeTargetEntry[] {
  return entries.filter(isLockedOnLiveSystem);
}
