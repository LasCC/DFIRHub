import * as yaml from "js-yaml";

export interface Logsource {
  category?: string;
  product?: string;
  service?: string;
}

export interface KapeTargetRef {
  name: string;
  slug: string;
}

const KAPE = {
  amcache: { name: "Amcache", slug: "amcache" },
  eventLogs: { name: "Event Logs", slug: "eventlogs" },
  eventLogsRdp: { name: "Event Logs (RDP)", slug: "eventlogs-rdp" },
  lnkFiles: { name: "LNK Files and Jump Lists", slug: "lnkfilesandjumplists" },
  mft: { name: "$MFT", slug: "mft" },
  powershellConsole: {
    name: "PowerShell Console Log",
    slug: "powershellconsole",
  },
  powershellTranscripts: {
    name: "PowerShell Transcripts",
    slug: "powershelltranscripts",
  },
  prefetch: { name: "Prefetch", slug: "prefetch" },
  recycleBin: { name: "Recycle Bin", slug: "recyclebin" },
  registrySystem: {
    name: "Registry Hives (System)",
    slug: "registryhivessystem",
  },
  registryUser: { name: "Registry Hives (User)", slug: "registryhivesuser" },
  scheduledTasks: { name: "Scheduled Tasks", slug: "scheduledtasks" },
  shimcache: { name: "Shimcache (SYSTEM hive)", slug: "registryhivessystem" },
  srum: { name: "SRUM", slug: "srum" },
  usnJournal: { name: "$UsnJrnl", slug: "j" },
  wbem: { name: "WMI Repository (WBEM)", slug: "wbem" },
  webBrowsers: { name: "Browser History", slug: "webbrowsers" },
  windowsDefender: { name: "Windows Defender", slug: "windowsdefender" },
} as const satisfies Record<string, KapeTargetRef>;

const POWERSHELL_TARGETS = [
  KAPE.powershellConsole,
  KAPE.powershellTranscripts,
  KAPE.eventLogs,
];
const REGISTRY_TARGETS = [
  KAPE.registrySystem,
  KAPE.registryUser,
  KAPE.amcache,
  KAPE.eventLogs,
];

const sigmaCategoryToKape: Record<string, KapeTargetRef[]> = {
  create_remote_thread: [KAPE.eventLogs],
  create_stream_hash: [KAPE.mft, KAPE.usnJournal, KAPE.eventLogs],
  dns_query: [KAPE.eventLogs, KAPE.webBrowsers],
  driver_load: [KAPE.amcache, KAPE.registrySystem, KAPE.eventLogs],
  file_delete: [KAPE.mft, KAPE.usnJournal, KAPE.recycleBin, KAPE.eventLogs],
  file_event: [KAPE.mft, KAPE.usnJournal, KAPE.lnkFiles, KAPE.recycleBin],
  image_load: [KAPE.amcache, KAPE.shimcache, KAPE.prefetch, KAPE.eventLogs],
  network_connection: [KAPE.srum, KAPE.eventLogs, KAPE.webBrowsers],
  pipe_created: [KAPE.eventLogs],
  process_access: [KAPE.eventLogs],
  process_creation: [
    KAPE.prefetch,
    KAPE.amcache,
    KAPE.srum,
    KAPE.eventLogs,
    KAPE.shimcache,
  ],
  process_tampering: [KAPE.eventLogs],
  ps_classic_provider_start: POWERSHELL_TARGETS,
  ps_classic_script: POWERSHELL_TARGETS,
  ps_classic_start: POWERSHELL_TARGETS,
  ps_module: POWERSHELL_TARGETS,
  ps_script: POWERSHELL_TARGETS,
  raw_access_thread: [KAPE.eventLogs],
  registry_add: REGISTRY_TARGETS,
  registry_delete: REGISTRY_TARGETS,
  registry_event: REGISTRY_TARGETS,
  registry_rename: REGISTRY_TARGETS,
  registry_set: REGISTRY_TARGETS,
  wmi_event: [KAPE.wbem, KAPE.eventLogs],
};

const sigmaServiceToKape: Record<string, KapeTargetRef[]> = {
  powershell: POWERSHELL_TARGETS,
  "powershell-classic": POWERSHELL_TARGETS,
  taskscheduler: [KAPE.scheduledTasks, KAPE.eventLogs],
  "terminalservices-localsessionmanager": [KAPE.eventLogsRdp, KAPE.eventLogs],
  windefend: [KAPE.windowsDefender, KAPE.eventLogs],
  wmi: [KAPE.wbem, KAPE.eventLogs],
};

const kapeToSigma: Record<string, string[]> = {
  Prefetch: ["process_creation", "image_load"],
  Amcache: ["process_creation", "registry_event", "image_load", "driver_load"],
  SRUM: ["process_creation", "network_connection"],
  EventLogs: [
    "process_creation",
    "network_connection",
    "dns_query",
    "ps_script",
    "ps_module",
    "file_event",
    "registry_event",
    "pipe_created",
    "process_access",
    "wmi_event",
  ],
  Shimcache: ["process_creation", "image_load"],
  $MFT: ["file_event", "file_delete", "create_stream_hash"],
  $UsnJrnl: ["file_event", "file_delete", "create_stream_hash"],
  "LNK Files": ["file_event"],
  "Registry Hives": ["registry_event"],
  WBEM: ["wmi_event"],
  Chrome: ["network_connection", "dns_query"],
};

export function getRelatedKapeTargets(logsource: Logsource): KapeTargetRef[] {
  const byCategory = logsource.category
    ? (sigmaCategoryToKape[logsource.category] ?? [])
    : [];
  if (byCategory.length > 0) {
    return byCategory;
  }
  const byService = logsource.service
    ? (sigmaServiceToKape[logsource.service] ?? [])
    : [];
  if (byService.length > 0) {
    return byService;
  }
  const isWindowsEventLogService =
    logsource.product === "windows" && Boolean(logsource.service);
  return isWindowsEventLogService ? [KAPE.eventLogs] : [];
}

export function getRelatedSigmaCategories(artifactName: string): string[] {
  return kapeToSigma[artifactName] ?? [];
}

function readLogsourceField(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

export function parseLogsourceFromYaml(yamlString: string): Logsource | null {
  try {
    const parsed = yaml.load(yamlString) as { logsource?: unknown } | null;
    const rawLogsource = parsed?.logsource;
    if (!rawLogsource || typeof rawLogsource !== "object") {
      return null;
    }

    const fields = rawLogsource as Record<string, unknown>;
    const logsource: Logsource = {
      category: readLogsourceField(fields.category),
      product: readLogsourceField(fields.product),
      service: readLogsourceField(fields.service),
    };
    const hasAnyField = Boolean(
      logsource.category || logsource.product || logsource.service
    );
    return hasAnyField ? logsource : null;
  } catch {
    return null;
  }
}
