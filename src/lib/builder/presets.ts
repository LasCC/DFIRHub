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
    summary: "KapeTriage parsed with the EZ tools. A safe first pass.",
    targets: ["KapeTriage"],
  },
  {
    id: "ransomware",
    label: "Ransomware",
    modules: ["!EZParser", "Hayabusa"],
    summary: "Triage, remote access tools and an event log timeline.",
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
    summary: "RDP, logon, network and execution evidence.",
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
    summary: "What ran: Prefetch, Amcache, Shimcache and UserAssist.",
    targets: ["ProgramExecution", "RegistryHives"],
  },
  {
    id: "persistence",
    label: "Persistence",
    modules: ["RECmd_DFIRBatch", "EvtxECmd"],
    summary:
      "Run keys, services, scheduled tasks, startup folders and event logs.",
    targets: ["RegistryHives", "ScheduledTasks", "StartupFolders", "EventLogs"],
  },
  {
    id: "exfiltration",
    label: "Data theft",
    modules: ["SQLECmd", "LECmd", "JLECmd", "RBCmd"],
    summary: "Browsers, cloud sync, USB, LNK, jump lists and Recycle Bin.",
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
    summary: "$MFT, $J, $LogFile and $Boot, parsed by MFTECmd.",
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
    summary: "Processes, network connections, sessions and users.",
    targets: [],
  },
  {
    id: "server",
    label: "Server and web",
    modules: ["!EZParser"],
    summary: "Triage plus IIS, Exchange, Confluence and SQL Server logs.",
    targets: ["KapeTriage", "ServerTriage"],
  },
];
