export interface ScenarioPreset {
  id: string;
  label: string;
  summary: string;
  targets: string[];
  modules: string[];
  moduleSource?: string;
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "triage",
    label: "Full triage",
    modules: ["!EZParser"],
    summary:
      "KapeTriage collection, parsed with every Eric Zimmerman tool. A safe first step for most cases.",
    targets: ["KapeTriage"],
  },
  {
    id: "ransomware",
    label: "Ransomware",
    modules: ["!EZParser", "Hayabusa"],
    summary:
      "Triage plus remote admin tools, with Hayabusa to build an event log timeline of the intrusion.",
    targets: ["KapeTriage", "RemoteAdmin"],
  },
  {
    id: "lateral-movement",
    label: "Lateral movement",
    modules: [
      "EvtxECmd",
      "RECmd_DFIRBatch",
      "PECmd",
      "AmcacheParser",
      "SrumECmd",
    ],
    summary:
      "RDP, logon and network evidence: event logs, RDP bitmap cache, SRUM, Amcache and Prefetch.",
    targets: [
      "EventLogs",
      "EventLogs-RDP",
      "RDPCache",
      "RDPLogs",
      "SRUM",
      "Amcache",
      "Prefetch",
      "RegistryHives",
    ],
  },
  {
    id: "execution",
    label: "Program execution",
    modules: [
      "PECmd",
      "AmcacheParser",
      "AppCompatCacheParser",
      "RECmd_DFIRBatch",
    ],
    summary:
      "What ran and when: Prefetch, Amcache, Shimcache and registry evidence of execution.",
    targets: ["ProgramExecution", "RegistryHives"],
  },
  {
    id: "persistence",
    label: "Persistence",
    modules: ["RECmd_DFIRBatch", "EvtxECmd"],
    summary:
      "Run keys, services, scheduled tasks, startup folders and the event logs that record them.",
    targets: ["RegistryHives", "ScheduledTasks", "StartupFolders", "EventLogs"],
  },
  {
    id: "exfiltration",
    label: "Data theft",
    modules: ["SQLECmd", "LECmd", "JLECmd", "RBCmd"],
    summary:
      "Browsers, cloud sync clients, USB devices, LNK files, jump lists and the Recycle Bin.",
    targets: [
      "WebBrowsers",
      "CloudStorage_All",
      "USBDetective",
      "LNKFilesAndJumpLists",
      "RecycleBin",
    ],
  },
  {
    id: "timeline",
    label: "File system timeline",
    modules: ["MFTECmd"],
    summary:
      "$MFT, $J, $LogFile and $Boot, parsed by MFTECmd for a full file system timeline.",
    targets: ["FileSystem"],
  },
  {
    id: "live-response",
    label: "Live response",
    moduleSource: "C:\\",
    modules: [
      "LiveResponse_NetworkDetails",
      "LiveResponse_ProcessDetails",
      "SystemInformation",
    ],
    summary:
      "Volatile state from the running host: processes, network connections, sessions and users.",
    targets: [],
  },
  {
    id: "server",
    label: "Server and web",
    modules: ["!EZParser"],
    summary:
      "Triage plus IIS, Apache, NGINX, Exchange, Confluence and SQL Server logs for web shell and exploit cases.",
    targets: ["KapeTriage", "ServerTriage"],
  },
];
