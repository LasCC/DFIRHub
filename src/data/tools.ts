// Tool definitions and artifact-to-tool mappings for DFIRHub
// This file provides the "Tool Template System" described in the implementation plan

export interface Tool {
  id: string;
  name: string;
  description: string;
  website?: string;
  platforms: ("Windows" | "Linux" | "Darwin" | "ESXi")[];
  category:
    | "zimmerman"
    | "velociraptor"
    | "manual"
    | "plaso"
    | "mac_apt"
    | "volatility";
  // Command template with placeholders: {{PATH}}, {{OUTPUT}}, {{DRIVE}}, {{USER}}
  commandTemplate: string;
  // For mounted image mode
  mountedTemplate?: string;
  // Source types this tool can handle
  sourceTypes: (
    | "FILE"
    | "REGISTRY_KEY"
    | "REGISTRY_VALUE"
    | "WMI"
    | "COMMAND"
    | "PATH"
  )[];
  // Optional: specific artifacts this tool is designed for (by name patterns)
  artifactPatterns?: RegExp[];
}

export interface ToolCategory {
  id: string;
  name: string;
  description: string;
}

// Tool categories for tab organization
export const toolCategories: ToolCategory[] = [
  {
    id: "zimmerman",
    name: "Zimmerman Tools",
    description: "Eric Zimmerman's forensic tools suite",
  },
  {
    id: "velociraptor",
    name: "Velociraptor",
    description: "VQL queries for live collection",
  },
  {
    id: "manual",
    name: "Manual",
    description: "PowerShell, Bash, and native commands",
  },
  {
    id: "plaso",
    name: "Plaso",
    description: "Log2Timeline timeline generation",
  },
  {
    id: "mac_apt",
    name: "mac_apt",
    description: "macOS Artifact Parsing Tool",
  },
  {
    id: "volatility",
    name: "Volatility",
    description: "Memory forensics framework",
  },
];

export const tools: Tool[] = [
  {
    id: "pecmd",
    name: "PECmd",
    description: "Windows Prefetch file parser",
    website: "https://ericzimmerman.github.io/",
    platforms: ["Windows"],
    category: "zimmerman",
    commandTemplate: 'PECmd.exe -d "{{PATH}}" --csv "{{OUTPUT}}"',
    mountedTemplate:
      'PECmd.exe -d "{{DRIVE}}\\Windows\\Prefetch" --csv "{{OUTPUT}}"',
    sourceTypes: ["FILE"],
    artifactPatterns: [/prefetch/i],
  },
  {
    id: "recmd",
    name: "RECmd",
    description: "Windows Registry explorer and parser",
    website: "https://ericzimmerman.github.io/",
    platforms: ["Windows"],
    category: "zimmerman",
    commandTemplate: 'RECmd.exe -f "{{PATH}}" --csv "{{OUTPUT}}"',
    mountedTemplate:
      'RECmd.exe -d "{{DRIVE}}\\Windows\\System32\\config" --csv "{{OUTPUT}}"',
    sourceTypes: ["REGISTRY_KEY", "REGISTRY_VALUE"],
    artifactPatterns: [
      /registry/i,
      /ntuser/i,
      /usrclass/i,
      /sam\b/i,
      /system\b/i,
      /software\b/i,
      /security\b/i,
    ],
  },
  {
    id: "recmd-batch",
    name: "RECmd (Batch)",
    description: "Batch process multiple registry hives",
    website: "https://ericzimmerman.github.io/",
    platforms: ["Windows"],
    category: "zimmerman",
    commandTemplate:
      'RECmd.exe --bn BatchExamples\\AllRegExecutablesFoundOrRun.reb -d "{{PATH}}" --csv "{{OUTPUT}}"',
    mountedTemplate:
      'RECmd.exe --bn BatchExamples\\AllRegExecutablesFoundOrRun.reb -d "{{DRIVE}}" --csv "{{OUTPUT}}"',
    sourceTypes: ["REGISTRY_KEY", "REGISTRY_VALUE"],
  },
  {
    id: "mftecmd",
    name: "MFTECmd",
    description: "Master File Table parser",
    website: "https://ericzimmerman.github.io/",
    platforms: ["Windows"],
    category: "zimmerman",
    commandTemplate: 'MFTECmd.exe -f "{{PATH}}" --csv "{{OUTPUT}}"',
    mountedTemplate: 'MFTECmd.exe -f "{{DRIVE}}\\$MFT" --csv "{{OUTPUT}}"',
    sourceTypes: ["FILE"],
    artifactPatterns: [/\$mft/i, /mft/i, /ntfs/i],
  },
  {
    id: "usnjrnlcmd",
    name: "MFTECmd (USN)",
    description: "USN Journal parser",
    website: "https://ericzimmerman.github.io/",
    platforms: ["Windows"],
    category: "zimmerman",
    commandTemplate: 'MFTECmd.exe -f "{{PATH}}" --csv "{{OUTPUT}}"',
    mountedTemplate:
      'MFTECmd.exe -f "{{DRIVE}}\\$Extend\\$UsnJrnl:$J" --csv "{{OUTPUT}}"',
    sourceTypes: ["FILE"],
    artifactPatterns: [/usnjrnl/i, /usn.*journal/i],
  },
  {
    id: "sbecmd",
    name: "SBECmd",
    description: "Shellbags explorer",
    website: "https://ericzimmerman.github.io/",
    platforms: ["Windows"],
    category: "zimmerman",
    commandTemplate: 'SBECmd.exe -d "{{PATH}}" --csv "{{OUTPUT}}"',
    mountedTemplate: 'SBECmd.exe -d "{{DRIVE}}\\Users" --csv "{{OUTPUT}}"',
    sourceTypes: ["REGISTRY_KEY", "REGISTRY_VALUE", "FILE"],
    artifactPatterns: [/shellbag/i, /bagmru/i],
  },
  {
    id: "lecmd",
    name: "LECmd",
    description: "Windows Shortcut (LNK) file parser",
    website: "https://ericzimmerman.github.io/",
    platforms: ["Windows"],
    category: "zimmerman",
    commandTemplate: 'LECmd.exe -d "{{PATH}}" --csv "{{OUTPUT}}"',
    mountedTemplate:
      'LECmd.exe -d "{{DRIVE}}\\Users\\{{USER}}\\AppData\\Roaming\\Microsoft\\Windows\\Recent" --csv "{{OUTPUT}}"',
    sourceTypes: ["FILE"],
    artifactPatterns: [/lnk/i, /shortcut/i, /recent/i],
  },
  {
    id: "jlecmd",
    name: "JLECmd",
    description: "Jump Lists parser",
    website: "https://ericzimmerman.github.io/",
    platforms: ["Windows"],
    category: "zimmerman",
    commandTemplate: 'JLECmd.exe -d "{{PATH}}" --csv "{{OUTPUT}}"',
    mountedTemplate:
      'JLECmd.exe -d "{{DRIVE}}\\Users\\{{USER}}\\AppData\\Roaming\\Microsoft\\Windows\\Recent\\AutomaticDestinations" --csv "{{OUTPUT}}"',
    sourceTypes: ["FILE"],
    artifactPatterns: [
      /jumplist/i,
      /automaticdestination/i,
      /customdestination/i,
    ],
  },
  {
    id: "amcacheparser",
    name: "AmcacheParser",
    description: "Windows Amcache.hve parser",
    website: "https://ericzimmerman.github.io/",
    platforms: ["Windows"],
    category: "zimmerman",
    commandTemplate: 'AmcacheParser.exe -f "{{PATH}}" --csv "{{OUTPUT}}"',
    mountedTemplate:
      'AmcacheParser.exe -f "{{DRIVE}}\\Windows\\AppCompat\\Programs\\Amcache.hve" --csv "{{OUTPUT}}"',
    sourceTypes: ["FILE", "REGISTRY_KEY"],
    artifactPatterns: [/amcache/i],
  },
  {
    id: "appcompatcacheparser",
    name: "AppCompatCacheParser",
    description: "Windows Application Compatibility Cache (ShimCache) parser",
    website: "https://ericzimmerman.github.io/",
    platforms: ["Windows"],
    category: "zimmerman",
    commandTemplate:
      'AppCompatCacheParser.exe -f "{{PATH}}" --csv "{{OUTPUT}}"',
    mountedTemplate:
      'AppCompatCacheParser.exe -f "{{DRIVE}}\\Windows\\System32\\config\\SYSTEM" --csv "{{OUTPUT}}"',
    sourceTypes: ["FILE", "REGISTRY_KEY"],
    artifactPatterns: [/shimcache/i, /appcompatcache/i],
  },
  {
    id: "evtxecmd",
    name: "EvtxECmd",
    description: "Windows Event Log parser",
    website: "https://ericzimmerman.github.io/",
    platforms: ["Windows"],
    category: "zimmerman",
    commandTemplate: 'EvtxECmd.exe -d "{{PATH}}" --csv "{{OUTPUT}}"',
    mountedTemplate:
      'EvtxECmd.exe -d "{{DRIVE}}\\Windows\\System32\\winevt\\Logs" --csv "{{OUTPUT}}"',
    sourceTypes: ["FILE"],
    artifactPatterns: [/evtx/i, /event.*log/i, /winevt/i],
  },
  {
    id: "sumecmd",
    name: "SumECmd",
    description: "Windows SRUM database parser",
    website: "https://ericzimmerman.github.io/",
    platforms: ["Windows"],
    category: "zimmerman",
    commandTemplate: 'SumECmd.exe -d "{{PATH}}" --csv "{{OUTPUT}}"',
    mountedTemplate:
      'SumECmd.exe -d "{{DRIVE}}\\Windows\\System32\\sru" --csv "{{OUTPUT}}"',
    sourceTypes: ["FILE"],
    artifactPatterns: [/srum/i, /srudb/i],
  },
  {
    id: "wxtcmd",
    name: "WxTCmd",
    description: "Windows Timeline (ActivitiesCache.db) parser",
    website: "https://ericzimmerman.github.io/",
    platforms: ["Windows"],
    category: "zimmerman",
    commandTemplate: 'WxTCmd.exe -f "{{PATH}}" --csv "{{OUTPUT}}"',
    mountedTemplate:
      'WxTCmd.exe -f "{{DRIVE}}\\Users\\{{USER}}\\AppData\\Local\\ConnectedDevicesPlatform\\L.{{USER}}\\ActivitiesCache.db" --csv "{{OUTPUT}}"',
    sourceTypes: ["FILE"],
    artifactPatterns: [/activitiescache/i, /timeline/i],
  },
  {
    id: "rbcmd",
    name: "RBCmd",
    description: "Recycle Bin parser",
    website: "https://ericzimmerman.github.io/",
    platforms: ["Windows"],
    category: "zimmerman",
    commandTemplate: 'RBCmd.exe -d "{{PATH}}" --csv "{{OUTPUT}}"',
    mountedTemplate:
      'RBCmd.exe -d "{{DRIVE}}\\$Recycle.Bin" --csv "{{OUTPUT}}"',
    sourceTypes: ["FILE"],
    artifactPatterns: [/recycle.*bin/i, /\$i/i, /\$r/i],
  },
  {
    id: "sqlecmd",
    name: "SQLECmd",
    description: "SQLite database parser with built-in maps",
    website: "https://ericzimmerman.github.io/",
    platforms: ["Windows"],
    category: "zimmerman",
    commandTemplate: 'SQLECmd.exe -d "{{PATH}}" --csv "{{OUTPUT}}"',
    mountedTemplate: 'SQLECmd.exe -d "{{DRIVE}}" --csv "{{OUTPUT}}"',
    sourceTypes: ["FILE"],
    artifactPatterns: [/sqlite/i, /\.db$/i, /chrome/i, /firefox/i, /edge/i],
  },
  {
    id: "hayabusa",
    name: "Hayabusa",
    description: "Fast Windows Event Log analyzer with Sigma rules",
    website: "https://github.com/Yamato-Security/hayabusa",
    platforms: ["Windows"],
    category: "zimmerman",
    commandTemplate:
      'hayabusa csv-timeline -d "{{PATH}}" -o "{{OUTPUT}}\\hayabusa_timeline.csv"',
    mountedTemplate:
      'hayabusa csv-timeline -d "{{DRIVE}}\\Windows\\System32\\winevt\\Logs" -o "{{OUTPUT}}\\hayabusa_timeline.csv"',
    sourceTypes: ["FILE"],
    artifactPatterns: [/evtx/i, /event.*log/i, /winevt/i, /security.*log/i],
  },
  {
    id: "vql-prefetch",
    name: "Windows.Forensics.Prefetch",
    description: "Collect and parse Prefetch files",
    website: "https://docs.velociraptor.app/",
    platforms: ["Windows"],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Windows.Forensics.Prefetch()",
    sourceTypes: ["FILE"],
    artifactPatterns: [/prefetch/i],
  },
  {
    id: "vql-amcache",
    name: "Windows.Forensics.Amcache",
    description: "Parse Amcache for execution evidence",
    website: "https://docs.velociraptor.app/",
    platforms: ["Windows"],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Windows.Forensics.Amcache()",
    sourceTypes: ["FILE", "REGISTRY_KEY"],
    artifactPatterns: [/amcache/i],
  },
  {
    id: "vql-shimcache",
    name: "Windows.Registry.AppCompatCache",
    description: "Parse ShimCache from SYSTEM hive",
    website: "https://docs.velociraptor.app/",
    platforms: ["Windows"],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Windows.Registry.AppCompatCache()",
    sourceTypes: ["REGISTRY_KEY"],
    artifactPatterns: [/shimcache/i, /appcompatcache/i],
  },
  {
    id: "vql-userassist",
    name: "Windows.Registry.UserAssist",
    description: "Parse UserAssist registry keys",
    website: "https://docs.velociraptor.app/",
    platforms: ["Windows"],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Windows.Registry.UserAssist()",
    sourceTypes: ["REGISTRY_KEY"],
    artifactPatterns: [/userassist/i],
  },
  {
    id: "vql-shellbags",
    name: "Windows.Forensics.Shellbags",
    description: "Parse Shellbags for folder access history",
    website: "https://docs.velociraptor.app/",
    platforms: ["Windows"],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Windows.Forensics.Shellbags()",
    sourceTypes: ["REGISTRY_KEY"],
    artifactPatterns: [/shellbag/i],
  },
  {
    id: "vql-lnk",
    name: "Windows.Forensics.Lnk",
    description: "Parse LNK shortcut files",
    website: "https://docs.velociraptor.app/",
    platforms: ["Windows"],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Windows.Forensics.Lnk()",
    sourceTypes: ["FILE"],
    artifactPatterns: [/lnk/i, /shortcut/i],
  },
  {
    id: "vql-jumplists",
    name: "Windows.Forensics.JumpLists",
    description: "Parse Jump Lists for recent file access",
    website: "https://docs.velociraptor.app/",
    platforms: ["Windows"],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Windows.Forensics.JumpLists()",
    sourceTypes: ["FILE"],
    artifactPatterns: [/jumplist/i],
  },
  {
    id: "vql-evtx",
    name: "Windows.EventLogs.Evtx",
    description: "Parse Windows Event Logs",
    website: "https://docs.velociraptor.app/",
    platforms: ["Windows"],
    category: "velociraptor",
    commandTemplate:
      'SELECT * FROM Artifact.Windows.EventLogs.Evtx(FileName="{{PATH}}")',
    sourceTypes: ["FILE"],
    artifactPatterns: [/evtx/i, /event.*log/i],
  },
  {
    id: "vql-mft",
    name: "Windows.NTFS.MFT",
    description: "Parse NTFS Master File Table",
    website: "https://docs.velociraptor.app/",
    platforms: ["Windows"],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Windows.NTFS.MFT()",
    sourceTypes: ["FILE"],
    artifactPatterns: [/\$mft/i, /mft/i],
  },
  {
    id: "vql-usn",
    name: "Windows.Forensics.Usn",
    description: "Parse USN Journal",
    website: "https://docs.velociraptor.app/",
    platforms: ["Windows"],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Windows.Forensics.Usn()",
    sourceTypes: ["FILE"],
    artifactPatterns: [/usnjrnl/i, /usn/i],
  },
  {
    id: "vql-srum",
    name: "Windows.Forensics.SRUM",
    description: "Parse SRUM database",
    website: "https://docs.velociraptor.app/",
    platforms: ["Windows"],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Windows.Forensics.SRUM()",
    sourceTypes: ["FILE"],
    artifactPatterns: [/srum/i],
  },
  {
    id: "vql-recyclebin",
    name: "Windows.Forensics.RecycleBin",
    description: "Parse Recycle Bin contents",
    website: "https://docs.velociraptor.app/",
    platforms: ["Windows"],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Windows.Forensics.RecycleBin()",
    sourceTypes: ["FILE"],
    artifactPatterns: [/recycle.*bin/i],
  },
  {
    id: "vql-services",
    name: "Windows.System.Services",
    description: "List Windows services",
    website: "https://docs.velociraptor.app/",
    platforms: ["Windows"],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Windows.System.Services()",
    sourceTypes: ["REGISTRY_KEY"],
    artifactPatterns: [/service/i],
  },
  {
    id: "vql-scheduled-tasks",
    name: "Windows.System.TaskScheduler",
    description: "List scheduled tasks",
    website: "https://docs.velociraptor.app/",
    platforms: ["Windows"],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Windows.System.TaskScheduler()",
    sourceTypes: ["FILE"],
    artifactPatterns: [/scheduled.*task/i, /task.*scheduler/i],
  },
  {
    id: "vql-autoruns",
    name: "Windows.Sysinternals.Autoruns",
    description: "Check autorun locations",
    website: "https://docs.velociraptor.app/",
    platforms: ["Windows"],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Windows.Sysinternals.Autoruns()",
    sourceTypes: ["REGISTRY_KEY", "FILE"],
    artifactPatterns: [/autorun/i, /startup/i, /run\s*key/i],
  },
  {
    id: "vql-browser-history",
    name: "Windows.Applications.Chrome.History",
    description: "Parse Chrome browser history",
    website: "https://docs.velociraptor.app/",
    platforms: ["Windows"],
    category: "velociraptor",
    commandTemplate:
      "SELECT * FROM Artifact.Windows.Applications.Chrome.History()",
    sourceTypes: ["FILE"],
    artifactPatterns: [/chrome.*history/i],
  },
  {
    id: "vql-linux-bashhistory",
    name: "Linux.Forensics.BashHistory",
    description: "Collect bash history files",
    website: "https://docs.velociraptor.app/",
    platforms: ["Linux"],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Linux.Forensics.BashHistory()",
    sourceTypes: ["FILE"],
    artifactPatterns: [/bash.*history/i, /\.bash_history/i],
  },
  {
    id: "vql-linux-syslog",
    name: "Linux.Syslog.SSHLogin",
    description: "Parse SSH login events from syslog",
    website: "https://docs.velociraptor.app/",
    platforms: ["Linux"],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Linux.Syslog.SSHLogin()",
    sourceTypes: ["FILE"],
    artifactPatterns: [/syslog/i, /ssh/i, /auth.*log/i],
  },
  {
    id: "vql-linux-cron",
    name: "Linux.Sys.Crontab",
    description: "List cron jobs",
    website: "https://docs.velociraptor.app/",
    platforms: ["Linux"],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Linux.Sys.Crontab()",
    sourceTypes: ["FILE"],
    artifactPatterns: [/cron/i, /crontab/i],
  },
  {
    id: "vql-macos-launchd",
    name: "MacOS.System.Launchd",
    description: "List launchd agents and daemons",
    website: "https://docs.velociraptor.app/",
    platforms: ["Darwin"],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.MacOS.System.Launchd()",
    sourceTypes: ["FILE"],
    artifactPatterns: [/launchagent/i, /launchdaemon/i, /launchd/i],
  },
  {
    id: "vql-macos-unifiedlogs",
    name: "MacOS.Forensics.UnifiedLogs",
    description: "Parse macOS Unified Logs",
    website: "https://docs.velociraptor.app/",
    platforms: ["Darwin"],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.MacOS.Forensics.UnifiedLogs()",
    sourceTypes: ["FILE"],
    artifactPatterns: [/unified.*log/i, /\.tracev3/i],
  },
  {
    id: "powershell-copy",
    name: "PowerShell Copy",
    description: "Copy files using PowerShell",
    platforms: ["Windows"],
    category: "manual",
    commandTemplate:
      'Copy-Item -Path "{{PATH}}" -Destination "{{OUTPUT}}" -Recurse',
    mountedTemplate:
      'Copy-Item -Path "{{DRIVE}}\\{{PATH}}" -Destination "{{OUTPUT}}" -Recurse',
    sourceTypes: ["FILE"],
  },
  {
    id: "robocopy",
    name: "Robocopy",
    description: "Robust file copy for Windows",
    platforms: ["Windows"],
    category: "manual",
    commandTemplate:
      'robocopy "{{PATH}}" "{{OUTPUT}}" /E /COPYALL /ZB /R:1 /W:1',
    mountedTemplate:
      'robocopy "{{DRIVE}}\\{{PATH}}" "{{OUTPUT}}" /E /COPYALL /ZB /R:1 /W:1',
    sourceTypes: ["FILE"],
  },
  {
    id: "reg-export",
    name: "Reg Export",
    description: "Export registry keys",
    platforms: ["Windows"],
    category: "manual",
    commandTemplate: 'reg export "{{PATH}}" "{{OUTPUT}}\\registry_export.reg"',
    sourceTypes: ["REGISTRY_KEY"],
  },
  {
    id: "wevtutil",
    name: "wevtutil",
    description: "Export Windows Event Logs",
    platforms: ["Windows"],
    category: "manual",
    commandTemplate: 'wevtutil epl "{{PATH}}" "{{OUTPUT}}\\exported.evtx"',
    sourceTypes: ["FILE"],
    artifactPatterns: [/evtx/i, /event.*log/i],
  },
  {
    id: "cp",
    name: "cp (Linux/macOS)",
    description: "Copy files using cp command",
    platforms: ["Linux", "Darwin"],
    category: "manual",
    commandTemplate: 'sudo cp -rp "{{PATH}}" "{{OUTPUT}}"',
    sourceTypes: ["FILE"],
  },
  {
    id: "tar",
    name: "tar (Archive)",
    description: "Create tar archive of files",
    platforms: ["Linux", "Darwin"],
    category: "manual",
    commandTemplate: 'sudo tar -cvzf "{{OUTPUT}}/artifact.tar.gz" "{{PATH}}"',
    sourceTypes: ["FILE"],
  },
  {
    id: "cat",
    name: "cat (View)",
    description: "View file contents",
    platforms: ["Linux", "Darwin"],
    category: "manual",
    commandTemplate: 'sudo cat "{{PATH}}"',
    sourceTypes: ["FILE"],
  },
  {
    id: "grep-log",
    name: "grep (Search)",
    description: "Search in log files",
    platforms: ["Linux", "Darwin"],
    category: "manual",
    commandTemplate: 'sudo grep -r "SEARCH_TERM" "{{PATH}}"',
    sourceTypes: ["FILE"],
    artifactPatterns: [/log/i, /syslog/i],
  },
  {
    id: "journalctl",
    name: "journalctl",
    description: "Query systemd journal",
    platforms: ["Linux"],
    category: "manual",
    commandTemplate:
      'sudo journalctl --since="YYYY-MM-DD" --until="YYYY-MM-DD" -o json > {{OUTPUT}}/journal.json',
    sourceTypes: ["FILE"],
    artifactPatterns: [/journal/i, /systemd/i],
  },
  {
    id: "plaso-all",
    name: "log2timeline (Full)",
    description: "Create comprehensive timeline",
    website: "https://plaso.readthedocs.io/",
    platforms: ["Windows", "Linux", "Darwin"],
    category: "plaso",
    commandTemplate:
      'log2timeline.py --storage-file {{OUTPUT}}/timeline.plaso "{{PATH}}"',
    sourceTypes: ["FILE"],
  },
  {
    id: "plaso-prefetch",
    name: "log2timeline (Prefetch)",
    description: "Parse Prefetch files with Plaso",
    website: "https://plaso.readthedocs.io/",
    platforms: ["Windows"],
    category: "plaso",
    commandTemplate:
      'log2timeline.py --parsers prefetch --storage-file {{OUTPUT}}/prefetch.plaso "{{PATH}}"',
    sourceTypes: ["FILE"],
    artifactPatterns: [/prefetch/i],
  },
  {
    id: "plaso-winevt",
    name: "log2timeline (WinEvt)",
    description: "Parse Windows Event Logs with Plaso",
    website: "https://plaso.readthedocs.io/",
    platforms: ["Windows"],
    category: "plaso",
    commandTemplate:
      'log2timeline.py --parsers winevtx --storage-file {{OUTPUT}}/evtx.plaso "{{PATH}}"',
    sourceTypes: ["FILE"],
    artifactPatterns: [/evtx/i, /event.*log/i],
  },
  {
    id: "plaso-registry",
    name: "log2timeline (Registry)",
    description: "Parse Windows Registry with Plaso",
    website: "https://plaso.readthedocs.io/",
    platforms: ["Windows"],
    category: "plaso",
    commandTemplate:
      'log2timeline.py --parsers winreg --storage-file {{OUTPUT}}/registry.plaso "{{PATH}}"',
    sourceTypes: ["REGISTRY_KEY", "REGISTRY_VALUE", "FILE"],
    artifactPatterns: [/registry/i, /ntuser/i, /system\b/i, /software\b/i],
  },
  {
    id: "psort",
    name: "psort",
    description: "Output Plaso timeline to CSV",
    website: "https://plaso.readthedocs.io/",
    platforms: ["Windows", "Linux", "Darwin"],
    category: "plaso",
    commandTemplate:
      "psort.py -o l2tcsv -w {{OUTPUT}}/timeline.csv {{OUTPUT}}/timeline.plaso",
    sourceTypes: ["FILE"],
  },
  {
    id: "mac_apt-all",
    name: "mac_apt (All Plugins)",
    description: "Run all mac_apt plugins",
    website: "https://github.com/ydkhatri/mac_apt",
    platforms: ["Darwin"],
    category: "mac_apt",
    commandTemplate: 'mac_apt.py -i "{{PATH}}" -o "{{OUTPUT}}" ALL',
    sourceTypes: ["FILE"],
  },
  {
    id: "mac_apt-safari",
    name: "mac_apt (Safari)",
    description: "Parse Safari browser artifacts",
    website: "https://github.com/ydkhatri/mac_apt",
    platforms: ["Darwin"],
    category: "mac_apt",
    commandTemplate: 'mac_apt.py -i "{{PATH}}" -o "{{OUTPUT}}" SAFARI',
    sourceTypes: ["FILE"],
    artifactPatterns: [/safari/i],
  },
  {
    id: "mac_apt-unifiedlogs",
    name: "mac_apt (Unified Logs)",
    description: "Parse macOS Unified Logs",
    website: "https://github.com/ydkhatri/mac_apt",
    platforms: ["Darwin"],
    category: "mac_apt",
    commandTemplate: 'mac_apt.py -i "{{PATH}}" -o "{{OUTPUT}}" UNIFIEDLOGS',
    sourceTypes: ["FILE"],
    artifactPatterns: [/unified.*log/i, /\.tracev3/i],
  },
  {
    id: "mac_apt-spotlight",
    name: "mac_apt (Spotlight)",
    description: "Parse Spotlight metadata",
    website: "https://github.com/ydkhatri/mac_apt",
    platforms: ["Darwin"],
    category: "mac_apt",
    commandTemplate: 'mac_apt.py -i "{{PATH}}" -o "{{OUTPUT}}" SPOTLIGHT',
    sourceTypes: ["FILE"],
    artifactPatterns: [/spotlight/i],
  },
  {
    id: "mac_apt-fsevents",
    name: "mac_apt (FSEvents)",
    description: "Parse FSEvents logs",
    website: "https://github.com/ydkhatri/mac_apt",
    platforms: ["Darwin"],
    category: "mac_apt",
    commandTemplate: 'mac_apt.py -i "{{PATH}}" -o "{{OUTPUT}}" FSEVENTS',
    sourceTypes: ["FILE"],
    artifactPatterns: [/fsevent/i],
  },
  {
    id: "vol-pslist",
    name: "Volatility (pslist)",
    description: "List running processes from memory",
    website: "https://volatilityfoundation.org/",
    platforms: ["Windows", "Linux", "Darwin"],
    category: "volatility",
    commandTemplate: 'vol.py -f "{{PATH}}" windows.pslist.PsList',
    sourceTypes: ["FILE"],
    artifactPatterns: [/memory/i, /\.raw$/i, /\.mem$/i, /hiberfil/i],
  },
  {
    id: "vol-netscan",
    name: "Volatility (netscan)",
    description: "Scan for network connections in memory",
    website: "https://volatilityfoundation.org/",
    platforms: ["Windows"],
    category: "volatility",
    commandTemplate: 'vol.py -f "{{PATH}}" windows.netscan.NetScan',
    sourceTypes: ["FILE"],
    artifactPatterns: [/memory/i, /\.raw$/i, /\.mem$/i],
  },
  {
    id: "vol-malfind",
    name: "Volatility (malfind)",
    description: "Find injected code in memory",
    website: "https://volatilityfoundation.org/",
    platforms: ["Windows"],
    category: "volatility",
    commandTemplate: 'vol.py -f "{{PATH}}" windows.malfind.Malfind',
    sourceTypes: ["FILE"],
    artifactPatterns: [/memory/i, /\.raw$/i, /\.mem$/i],
  },
  {
    id: "vol-cmdline",
    name: "Volatility (cmdline)",
    description: "Display process command-line arguments",
    website: "https://volatilityfoundation.org/",
    platforms: ["Windows"],
    category: "volatility",
    commandTemplate: 'vol.py -f "{{PATH}}" windows.cmdline.CmdLine',
    sourceTypes: ["FILE"],
    artifactPatterns: [/memory/i, /\.raw$/i, /\.mem$/i],
  },
  {
    id: "vol-linux-pslist",
    name: "Volatility Linux (pslist)",
    description: "List Linux processes from memory",
    website: "https://volatilityfoundation.org/",
    platforms: ["Linux"],
    category: "volatility",
    commandTemplate: 'vol.py -f "{{PATH}}" linux.pslist.PsList',
    sourceTypes: ["FILE"],
    artifactPatterns: [/memory/i, /\.raw$/i, /\.mem$/i, /\.lime$/i],
  },
];

// Get tools that can handle a specific artifact
export function getToolsForArtifact(artifact: {
  name: string;
  supported_os?: string[];
  sources?: Array<{ type: string }>;
}): Tool[] {
  const matchingTools: Tool[] = [];
  const genericTools: Tool[] = [];
  const sourceTypes = artifact.sources?.map((s) => s.type) || [];
  const supportedOS = artifact.supported_os || [];

  // Pre-compute normalized sets for O(1) lookups
  const osSet = new Set(supportedOS.map((os) => os.toLowerCase()));
  const sourceTypeSet = new Set(sourceTypes);

  for (const tool of tools) {
    // Check platform compatibility
    const platformMatch = tool.platforms.some((p) =>
      osSet.has(p.toLowerCase())
    );

    if (!platformMatch) {
      continue;
    }

    // Tools with artifactPatterns are SPECIALIZED - only match when pattern matches
    if (tool.artifactPatterns && tool.artifactPatterns.length > 0) {
      const nameMatch = tool.artifactPatterns.some((pattern) =>
        pattern.test(artifact.name)
      );
      if (nameMatch) {
        matchingTools.push(tool);
      }
      // Don't fall through to source type matching for specialized tools
      continue;
    }

    // Tools WITHOUT artifactPatterns are GENERIC - match based on source type
    // Only include generic "manual" category tools as fallback
    if (tool.category === "manual") {
      const sourceTypeMatch = tool.sourceTypes.some((st) =>
        sourceTypeSet.has(st)
      );
      if (sourceTypeMatch) {
        genericTools.push(tool);
      }
    }
  }

  // Combine: specialized tools first, then generic fallbacks
  const allTools = [...matchingTools, ...genericTools];

  // Remove duplicates
  const seen = new Set<string>();
  const uniqueTools = allTools.filter((tool) => {
    if (seen.has(tool.id)) {
      return false;
    }
    seen.add(tool.id);
    return true;
  });

  // Sort by category priority within each group
  const categoryOrder = [
    "zimmerman",
    "velociraptor",
    "plaso",
    "mac_apt",
    "volatility",
    "manual",
  ];
  return uniqueTools.sort(
    (a, b) =>
      categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category)
  );
}

// Get tools by category
export function getToolsByCategory(category: string): Tool[] {
  return tools.filter((t) => t.category === category);
}

// Generate command with substitutions
export function generateCommand(
  tool: Tool,
  options: {
    path?: string;
    output?: string;
    drive?: string;
    user?: string;
    mode?: "live" | "mounted";
  }
): string {
  const {
    path = "",
    output = "C:\\output",
    drive = "D:",
    user = "*",
    mode = "live",
  } = options;

  const template =
    mode === "mounted" && tool.mountedTemplate
      ? tool.mountedTemplate
      : tool.commandTemplate;

  return template
    .replace(/\{\{PATH\}\}/g, path)
    .replace(/\{\{OUTPUT\}\}/g, output)
    .replace(/\{\{DRIVE\}\}/g, drive)
    .replace(/\{\{USER\}\}/g, user);
}
