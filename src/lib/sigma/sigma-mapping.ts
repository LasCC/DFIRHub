import * as yaml from "js-yaml";

export interface Logsource {
  category: string;
  product: string;
  service?: string;
}

export interface KapeTargetRef {
  name: string;
  slug: string;
}

const sigmaToKape: Record<string, KapeTargetRef[]> = {
  process_creation: [
    { name: "Prefetch", slug: "prefetch" },
    { name: "Amcache", slug: "amcache" },
    { name: "SRUM", slug: "srum" },
    { name: "Event Logs", slug: "eventlogs" },
    { name: "Shimcache", slug: "shimcache" },
  ],
  file_event: [
    { name: "$MFT", slug: "-mft" },
    { name: "$UsnJrnl", slug: "-j" },
    { name: "LNK Files", slug: "lnkfilesandumpdirectories" },
    { name: "Recycle Bin", slug: "recyclebin" },
  ],
  registry_event: [
    { name: "Registry Hives (System)", slug: "registryhivessystem" },
    { name: "Registry Hives (User)", slug: "registryhivesuser" },
    { name: "Amcache", slug: "amcache" },
  ],
  network_connection: [
    { name: "SRUM", slug: "srum" },
    { name: "Event Logs", slug: "eventlogs" },
    { name: "Browser History", slug: "chrome" },
  ],
  image_load: [
    { name: "Amcache", slug: "amcache" },
    { name: "Shimcache", slug: "shimcache" },
    { name: "Prefetch", slug: "prefetch" },
  ],
  dns_query: [{ name: "Event Logs", slug: "eventlogs" }],
  logon: [
    { name: "Event Logs", slug: "eventlogs" },
    { name: "RDP Cache", slug: "rdpcache" },
  ],
  ps_script: [
    { name: "PowerShell Console Log", slug: "powershellconsole" },
    { name: "Event Logs", slug: "eventlogs" },
  ],
};

const kapeToSigma: Record<string, string[]> = {
  Prefetch: ["process_creation", "image_load"],
  Amcache: ["process_creation", "registry_event", "image_load"],
  SRUM: ["process_creation", "network_connection"],
  EventLogs: [
    "process_creation",
    "network_connection",
    "dns_query",
    "logon",
    "ps_script",
    "file_event",
    "registry_event",
  ],
  Shimcache: ["process_creation", "image_load"],
  $MFT: ["file_event"],
  $UsnJrnl: ["file_event"],
  "LNK Files": ["file_event"],
  "Registry Hives": ["registry_event"],
  "RDP Cache": ["logon"],
  Chrome: ["network_connection"],
};

export function getRelatedKapeTargets(logsource: Logsource): KapeTargetRef[] {
  const key = logsource.category;
  return sigmaToKape[key] ?? [];
}

export function getRelatedSigmaCategories(artifactName: string): string[] {
  return kapeToSigma[artifactName] ?? [];
}

export function parseLogsourceFromYaml(yamlString: string): Logsource | null {
  try {
    const parsed = yaml.load(yamlString) as any;
    if (!parsed?.logsource) {
      return null;
    }

    const { category, product, service } = parsed.logsource;
    if (!(category && product)) {
      return null;
    }

    return { category, product, service };
  } catch {
    return null;
  }
}
