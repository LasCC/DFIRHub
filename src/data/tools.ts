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
    description: "Eric Zimmerman's forensic tools suite",
    id: "zimmerman",
    name: "Zimmerman Tools",
  },
  {
    description: "VQL queries for live collection",
    id: "velociraptor",
    name: "Velociraptor",
  },
  {
    description: "PowerShell, Bash, and native commands",
    id: "manual",
    name: "Manual",
  },
  {
    description: "Log2Timeline timeline generation",
    id: "plaso",
    name: "Plaso",
  },
  {
    description: "macOS Artifact Parsing Tool",
    id: "mac_apt",
    name: "mac_apt",
  },
  {
    description: "Memory forensics framework",
    id: "volatility",
    name: "Volatility",
  },
];

export const tools: Tool[] = [
  {
    artifactPatterns: [/prefetch/i],
    category: "zimmerman",
    commandTemplate: 'PECmd.exe -d "{{PATH}}" --csv "{{OUTPUT}}"',
    description: "Windows Prefetch file parser",
    id: "pecmd",
    mountedTemplate:
      'PECmd.exe -d "{{DRIVE}}\\Windows\\Prefetch" --csv "{{OUTPUT}}"',
    name: "PECmd",
    platforms: ["Windows"],
    sourceTypes: ["FILE"],
    website: "https://ericzimmerman.github.io/",
  },
  {
    artifactPatterns: [
      /registry/i,
      /ntuser/i,
      /usrclass/i,
      /sam\b/i,
      /system\b/i,
      /software\b/i,
      /security\b/i,
    ],
    category: "zimmerman",
    commandTemplate: 'RECmd.exe -f "{{PATH}}" --csv "{{OUTPUT}}"',
    description: "Windows Registry explorer and parser",
    id: "recmd",
    mountedTemplate:
      'RECmd.exe -d "{{DRIVE}}\\Windows\\System32\\config" --csv "{{OUTPUT}}"',
    name: "RECmd",
    platforms: ["Windows"],
    sourceTypes: ["REGISTRY_KEY", "REGISTRY_VALUE"],
    website: "https://ericzimmerman.github.io/",
  },
  {
    category: "zimmerman",
    commandTemplate:
      'RECmd.exe --bn BatchExamples\\AllRegExecutablesFoundOrRun.reb -d "{{PATH}}" --csv "{{OUTPUT}}"',
    description: "Batch process multiple registry hives",
    id: "recmd-batch",
    mountedTemplate:
      'RECmd.exe --bn BatchExamples\\AllRegExecutablesFoundOrRun.reb -d "{{DRIVE}}" --csv "{{OUTPUT}}"',
    name: "RECmd (Batch)",
    platforms: ["Windows"],
    sourceTypes: ["REGISTRY_KEY", "REGISTRY_VALUE"],
    website: "https://ericzimmerman.github.io/",
  },
  {
    artifactPatterns: [/\$mft/i, /mft/i, /ntfs/i],
    category: "zimmerman",
    commandTemplate: 'MFTECmd.exe -f "{{PATH}}" --csv "{{OUTPUT}}"',
    description: "Master File Table parser",
    id: "mftecmd",
    mountedTemplate: 'MFTECmd.exe -f "{{DRIVE}}\\$MFT" --csv "{{OUTPUT}}"',
    name: "MFTECmd",
    platforms: ["Windows"],
    sourceTypes: ["FILE"],
    website: "https://ericzimmerman.github.io/",
  },
  {
    artifactPatterns: [/usnjrnl/i, /usn.*journal/i],
    category: "zimmerman",
    commandTemplate: 'MFTECmd.exe -f "{{PATH}}" --csv "{{OUTPUT}}"',
    description: "USN Journal parser",
    id: "usnjrnlcmd",
    mountedTemplate:
      'MFTECmd.exe -f "{{DRIVE}}\\$Extend\\$UsnJrnl:$J" --csv "{{OUTPUT}}"',
    name: "MFTECmd (USN)",
    platforms: ["Windows"],
    sourceTypes: ["FILE"],
    website: "https://ericzimmerman.github.io/",
  },
  {
    artifactPatterns: [/shellbag/i, /bagmru/i],
    category: "zimmerman",
    commandTemplate: 'SBECmd.exe -d "{{PATH}}" --csv "{{OUTPUT}}"',
    description: "Shellbags explorer",
    id: "sbecmd",
    mountedTemplate: 'SBECmd.exe -d "{{DRIVE}}\\Users" --csv "{{OUTPUT}}"',
    name: "SBECmd",
    platforms: ["Windows"],
    sourceTypes: ["REGISTRY_KEY", "REGISTRY_VALUE", "FILE"],
    website: "https://ericzimmerman.github.io/",
  },
  {
    artifactPatterns: [/lnk/i, /shortcut/i, /recent/i],
    category: "zimmerman",
    commandTemplate: 'LECmd.exe -d "{{PATH}}" --csv "{{OUTPUT}}"',
    description: "Windows Shortcut (LNK) file parser",
    id: "lecmd",
    mountedTemplate:
      'LECmd.exe -d "{{DRIVE}}\\Users\\{{USER}}\\AppData\\Roaming\\Microsoft\\Windows\\Recent" --csv "{{OUTPUT}}"',
    name: "LECmd",
    platforms: ["Windows"],
    sourceTypes: ["FILE"],
    website: "https://ericzimmerman.github.io/",
  },
  {
    artifactPatterns: [
      /jumplist/i,
      /automaticdestination/i,
      /customdestination/i,
    ],
    category: "zimmerman",
    commandTemplate: 'JLECmd.exe -d "{{PATH}}" --csv "{{OUTPUT}}"',
    description: "Jump Lists parser",
    id: "jlecmd",
    mountedTemplate:
      'JLECmd.exe -d "{{DRIVE}}\\Users\\{{USER}}\\AppData\\Roaming\\Microsoft\\Windows\\Recent\\AutomaticDestinations" --csv "{{OUTPUT}}"',
    name: "JLECmd",
    platforms: ["Windows"],
    sourceTypes: ["FILE"],
    website: "https://ericzimmerman.github.io/",
  },
  {
    artifactPatterns: [/amcache/i],
    category: "zimmerman",
    commandTemplate: 'AmcacheParser.exe -f "{{PATH}}" --csv "{{OUTPUT}}"',
    description: "Windows Amcache.hve parser",
    id: "amcacheparser",
    mountedTemplate:
      'AmcacheParser.exe -f "{{DRIVE}}\\Windows\\AppCompat\\Programs\\Amcache.hve" --csv "{{OUTPUT}}"',
    name: "AmcacheParser",
    platforms: ["Windows"],
    sourceTypes: ["FILE", "REGISTRY_KEY"],
    website: "https://ericzimmerman.github.io/",
  },
  {
    artifactPatterns: [/shimcache/i, /appcompatcache/i],
    category: "zimmerman",
    commandTemplate:
      'AppCompatCacheParser.exe -f "{{PATH}}" --csv "{{OUTPUT}}"',
    description: "Windows Application Compatibility Cache (ShimCache) parser",
    id: "appcompatcacheparser",
    mountedTemplate:
      'AppCompatCacheParser.exe -f "{{DRIVE}}\\Windows\\System32\\config\\SYSTEM" --csv "{{OUTPUT}}"',
    name: "AppCompatCacheParser",
    platforms: ["Windows"],
    sourceTypes: ["FILE", "REGISTRY_KEY"],
    website: "https://ericzimmerman.github.io/",
  },
  {
    artifactPatterns: [/evtx/i, /event.*log/i, /winevt/i],
    category: "zimmerman",
    commandTemplate: 'EvtxECmd.exe -d "{{PATH}}" --csv "{{OUTPUT}}"',
    description: "Windows Event Log parser",
    id: "evtxecmd",
    mountedTemplate:
      'EvtxECmd.exe -d "{{DRIVE}}\\Windows\\System32\\winevt\\Logs" --csv "{{OUTPUT}}"',
    name: "EvtxECmd",
    platforms: ["Windows"],
    sourceTypes: ["FILE"],
    website: "https://ericzimmerman.github.io/",
  },
  {
    artifactPatterns: [/srum/i, /srudb/i],
    category: "zimmerman",
    commandTemplate: 'SumECmd.exe -d "{{PATH}}" --csv "{{OUTPUT}}"',
    description: "Windows SRUM database parser",
    id: "sumecmd",
    mountedTemplate:
      'SumECmd.exe -d "{{DRIVE}}\\Windows\\System32\\sru" --csv "{{OUTPUT}}"',
    name: "SumECmd",
    platforms: ["Windows"],
    sourceTypes: ["FILE"],
    website: "https://ericzimmerman.github.io/",
  },
  {
    artifactPatterns: [/activitiescache/i, /timeline/i],
    category: "zimmerman",
    commandTemplate: 'WxTCmd.exe -f "{{PATH}}" --csv "{{OUTPUT}}"',
    description: "Windows Timeline (ActivitiesCache.db) parser",
    id: "wxtcmd",
    mountedTemplate:
      'WxTCmd.exe -f "{{DRIVE}}\\Users\\{{USER}}\\AppData\\Local\\ConnectedDevicesPlatform\\L.{{USER}}\\ActivitiesCache.db" --csv "{{OUTPUT}}"',
    name: "WxTCmd",
    platforms: ["Windows"],
    sourceTypes: ["FILE"],
    website: "https://ericzimmerman.github.io/",
  },
  {
    artifactPatterns: [/recycle.*bin/i, /\$i/i, /\$r/i],
    category: "zimmerman",
    commandTemplate: 'RBCmd.exe -d "{{PATH}}" --csv "{{OUTPUT}}"',
    description: "Recycle Bin parser",
    id: "rbcmd",
    mountedTemplate:
      'RBCmd.exe -d "{{DRIVE}}\\$Recycle.Bin" --csv "{{OUTPUT}}"',
    name: "RBCmd",
    platforms: ["Windows"],
    sourceTypes: ["FILE"],
    website: "https://ericzimmerman.github.io/",
  },
  {
    artifactPatterns: [/sqlite/i, /\.db$/i, /chrome/i, /firefox/i, /edge/i],
    category: "zimmerman",
    commandTemplate: 'SQLECmd.exe -d "{{PATH}}" --csv "{{OUTPUT}}"',
    description: "SQLite database parser with built-in maps",
    id: "sqlecmd",
    mountedTemplate: 'SQLECmd.exe -d "{{DRIVE}}" --csv "{{OUTPUT}}"',
    name: "SQLECmd",
    platforms: ["Windows"],
    sourceTypes: ["FILE"],
    website: "https://ericzimmerman.github.io/",
  },
  {
    artifactPatterns: [/evtx/i, /event.*log/i, /winevt/i, /security.*log/i],
    category: "zimmerman",
    commandTemplate:
      'hayabusa csv-timeline -d "{{PATH}}" -o "{{OUTPUT}}\\hayabusa_timeline.csv"',
    description: "Fast Windows Event Log analyzer with Sigma rules",
    id: "hayabusa",
    mountedTemplate:
      'hayabusa csv-timeline -d "{{DRIVE}}\\Windows\\System32\\winevt\\Logs" -o "{{OUTPUT}}\\hayabusa_timeline.csv"',
    name: "Hayabusa",
    platforms: ["Windows"],
    sourceTypes: ["FILE"],
    website: "https://github.com/Yamato-Security/hayabusa",
  },
  {
    artifactPatterns: [/prefetch/i],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Windows.Forensics.Prefetch()",
    description: "Collect and parse Prefetch files",
    id: "vql-prefetch",
    name: "Windows.Forensics.Prefetch",
    platforms: ["Windows"],
    sourceTypes: ["FILE"],
    website: "https://docs.velociraptor.app/",
  },
  {
    artifactPatterns: [/amcache/i],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Windows.Forensics.Amcache()",
    description: "Parse Amcache for execution evidence",
    id: "vql-amcache",
    name: "Windows.Forensics.Amcache",
    platforms: ["Windows"],
    sourceTypes: ["FILE", "REGISTRY_KEY"],
    website: "https://docs.velociraptor.app/",
  },
  {
    artifactPatterns: [/shimcache/i, /appcompatcache/i],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Windows.Registry.AppCompatCache()",
    description: "Parse ShimCache from SYSTEM hive",
    id: "vql-shimcache",
    name: "Windows.Registry.AppCompatCache",
    platforms: ["Windows"],
    sourceTypes: ["REGISTRY_KEY"],
    website: "https://docs.velociraptor.app/",
  },
  {
    artifactPatterns: [/userassist/i],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Windows.Registry.UserAssist()",
    description: "Parse UserAssist registry keys",
    id: "vql-userassist",
    name: "Windows.Registry.UserAssist",
    platforms: ["Windows"],
    sourceTypes: ["REGISTRY_KEY"],
    website: "https://docs.velociraptor.app/",
  },
  {
    artifactPatterns: [/shellbag/i],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Windows.Forensics.Shellbags()",
    description: "Parse Shellbags for folder access history",
    id: "vql-shellbags",
    name: "Windows.Forensics.Shellbags",
    platforms: ["Windows"],
    sourceTypes: ["REGISTRY_KEY"],
    website: "https://docs.velociraptor.app/",
  },
  {
    artifactPatterns: [/lnk/i, /shortcut/i],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Windows.Forensics.Lnk()",
    description: "Parse LNK shortcut files",
    id: "vql-lnk",
    name: "Windows.Forensics.Lnk",
    platforms: ["Windows"],
    sourceTypes: ["FILE"],
    website: "https://docs.velociraptor.app/",
  },
  {
    artifactPatterns: [/jumplist/i],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Windows.Forensics.JumpLists()",
    description: "Parse Jump Lists for recent file access",
    id: "vql-jumplists",
    name: "Windows.Forensics.JumpLists",
    platforms: ["Windows"],
    sourceTypes: ["FILE"],
    website: "https://docs.velociraptor.app/",
  },
  {
    artifactPatterns: [/evtx/i, /event.*log/i],
    category: "velociraptor",
    commandTemplate:
      'SELECT * FROM Artifact.Windows.EventLogs.Evtx(FileName="{{PATH}}")',
    description: "Parse Windows Event Logs",
    id: "vql-evtx",
    name: "Windows.EventLogs.Evtx",
    platforms: ["Windows"],
    sourceTypes: ["FILE"],
    website: "https://docs.velociraptor.app/",
  },
  {
    artifactPatterns: [/\$mft/i, /mft/i],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Windows.NTFS.MFT()",
    description: "Parse NTFS Master File Table",
    id: "vql-mft",
    name: "Windows.NTFS.MFT",
    platforms: ["Windows"],
    sourceTypes: ["FILE"],
    website: "https://docs.velociraptor.app/",
  },
  {
    artifactPatterns: [/usnjrnl/i, /usn/i],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Windows.Forensics.Usn()",
    description: "Parse USN Journal",
    id: "vql-usn",
    name: "Windows.Forensics.Usn",
    platforms: ["Windows"],
    sourceTypes: ["FILE"],
    website: "https://docs.velociraptor.app/",
  },
  {
    artifactPatterns: [/srum/i],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Windows.Forensics.SRUM()",
    description: "Parse SRUM database",
    id: "vql-srum",
    name: "Windows.Forensics.SRUM",
    platforms: ["Windows"],
    sourceTypes: ["FILE"],
    website: "https://docs.velociraptor.app/",
  },
  {
    artifactPatterns: [/recycle.*bin/i],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Windows.Forensics.RecycleBin()",
    description: "Parse Recycle Bin contents",
    id: "vql-recyclebin",
    name: "Windows.Forensics.RecycleBin",
    platforms: ["Windows"],
    sourceTypes: ["FILE"],
    website: "https://docs.velociraptor.app/",
  },
  {
    artifactPatterns: [/service/i],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Windows.System.Services()",
    description: "List Windows services",
    id: "vql-services",
    name: "Windows.System.Services",
    platforms: ["Windows"],
    sourceTypes: ["REGISTRY_KEY"],
    website: "https://docs.velociraptor.app/",
  },
  {
    artifactPatterns: [/scheduled.*task/i, /task.*scheduler/i],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Windows.System.TaskScheduler()",
    description: "List scheduled tasks",
    id: "vql-scheduled-tasks",
    name: "Windows.System.TaskScheduler",
    platforms: ["Windows"],
    sourceTypes: ["FILE"],
    website: "https://docs.velociraptor.app/",
  },
  {
    artifactPatterns: [/autorun/i, /startup/i, /run\s*key/i],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Windows.Sysinternals.Autoruns()",
    description: "Check autorun locations",
    id: "vql-autoruns",
    name: "Windows.Sysinternals.Autoruns",
    platforms: ["Windows"],
    sourceTypes: ["REGISTRY_KEY", "FILE"],
    website: "https://docs.velociraptor.app/",
  },
  {
    artifactPatterns: [/chrome.*history/i],
    category: "velociraptor",
    commandTemplate:
      "SELECT * FROM Artifact.Windows.Applications.Chrome.History()",
    description: "Parse Chrome browser history",
    id: "vql-browser-history",
    name: "Windows.Applications.Chrome.History",
    platforms: ["Windows"],
    sourceTypes: ["FILE"],
    website: "https://docs.velociraptor.app/",
  },
  {
    artifactPatterns: [/bash.*history/i, /\.bash_history/i],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Linux.Forensics.BashHistory()",
    description: "Collect bash history files",
    id: "vql-linux-bashhistory",
    name: "Linux.Forensics.BashHistory",
    platforms: ["Linux"],
    sourceTypes: ["FILE"],
    website: "https://docs.velociraptor.app/",
  },
  {
    artifactPatterns: [/syslog/i, /ssh/i, /auth.*log/i],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Linux.Syslog.SSHLogin()",
    description: "Parse SSH login events from syslog",
    id: "vql-linux-syslog",
    name: "Linux.Syslog.SSHLogin",
    platforms: ["Linux"],
    sourceTypes: ["FILE"],
    website: "https://docs.velociraptor.app/",
  },
  {
    artifactPatterns: [/cron/i, /crontab/i],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.Linux.Sys.Crontab()",
    description: "List cron jobs",
    id: "vql-linux-cron",
    name: "Linux.Sys.Crontab",
    platforms: ["Linux"],
    sourceTypes: ["FILE"],
    website: "https://docs.velociraptor.app/",
  },
  {
    artifactPatterns: [/launchagent/i, /launchdaemon/i, /launchd/i],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.MacOS.System.Launchd()",
    description: "List launchd agents and daemons",
    id: "vql-macos-launchd",
    name: "MacOS.System.Launchd",
    platforms: ["Darwin"],
    sourceTypes: ["FILE"],
    website: "https://docs.velociraptor.app/",
  },
  {
    artifactPatterns: [/unified.*log/i, /\.tracev3/i],
    category: "velociraptor",
    commandTemplate: "SELECT * FROM Artifact.MacOS.Forensics.UnifiedLogs()",
    description: "Parse macOS Unified Logs",
    id: "vql-macos-unifiedlogs",
    name: "MacOS.Forensics.UnifiedLogs",
    platforms: ["Darwin"],
    sourceTypes: ["FILE"],
    website: "https://docs.velociraptor.app/",
  },
  {
    category: "manual",
    commandTemplate:
      'Copy-Item -Path "{{PATH}}" -Destination "{{OUTPUT}}" -Recurse',
    description: "Copy files using PowerShell",
    id: "powershell-copy",
    mountedTemplate:
      'Copy-Item -Path "{{DRIVE}}\\{{PATH}}" -Destination "{{OUTPUT}}" -Recurse',
    name: "PowerShell Copy",
    platforms: ["Windows"],
    sourceTypes: ["FILE"],
  },
  {
    category: "manual",
    commandTemplate:
      'robocopy "{{PATH}}" "{{OUTPUT}}" /E /COPYALL /ZB /R:1 /W:1',
    description: "Robust file copy for Windows",
    id: "robocopy",
    mountedTemplate:
      'robocopy "{{DRIVE}}\\{{PATH}}" "{{OUTPUT}}" /E /COPYALL /ZB /R:1 /W:1',
    name: "Robocopy",
    platforms: ["Windows"],
    sourceTypes: ["FILE"],
  },
  {
    category: "manual",
    commandTemplate: 'reg export "{{PATH}}" "{{OUTPUT}}\\registry_export.reg"',
    description: "Export registry keys",
    id: "reg-export",
    name: "Reg Export",
    platforms: ["Windows"],
    sourceTypes: ["REGISTRY_KEY"],
  },
  {
    artifactPatterns: [/evtx/i, /event.*log/i],
    category: "manual",
    commandTemplate: 'wevtutil epl "{{PATH}}" "{{OUTPUT}}\\exported.evtx"',
    description: "Export Windows Event Logs",
    id: "wevtutil",
    name: "wevtutil",
    platforms: ["Windows"],
    sourceTypes: ["FILE"],
  },
  {
    category: "manual",
    commandTemplate: 'sudo cp -rp "{{PATH}}" "{{OUTPUT}}"',
    description: "Copy files using cp command",
    id: "cp",
    name: "cp (Linux/macOS)",
    platforms: ["Linux", "Darwin"],
    sourceTypes: ["FILE"],
  },
  {
    category: "manual",
    commandTemplate: 'sudo tar -cvzf "{{OUTPUT}}/artifact.tar.gz" "{{PATH}}"',
    description: "Create tar archive of files",
    id: "tar",
    name: "tar (Archive)",
    platforms: ["Linux", "Darwin"],
    sourceTypes: ["FILE"],
  },
  {
    category: "manual",
    commandTemplate: 'sudo cat "{{PATH}}"',
    description: "View file contents",
    id: "cat",
    name: "cat (View)",
    platforms: ["Linux", "Darwin"],
    sourceTypes: ["FILE"],
  },
  {
    artifactPatterns: [/log/i, /syslog/i],
    category: "manual",
    commandTemplate: 'sudo grep -r "SEARCH_TERM" "{{PATH}}"',
    description: "Search in log files",
    id: "grep-log",
    name: "grep (Search)",
    platforms: ["Linux", "Darwin"],
    sourceTypes: ["FILE"],
  },
  {
    artifactPatterns: [/journal/i, /systemd/i],
    category: "manual",
    commandTemplate:
      'sudo journalctl --since="YYYY-MM-DD" --until="YYYY-MM-DD" -o json > {{OUTPUT}}/journal.json',
    description: "Query systemd journal",
    id: "journalctl",
    name: "journalctl",
    platforms: ["Linux"],
    sourceTypes: ["FILE"],
  },
  {
    category: "plaso",
    commandTemplate:
      'log2timeline.py --storage-file {{OUTPUT}}/timeline.plaso "{{PATH}}"',
    description: "Create comprehensive timeline",
    id: "plaso-all",
    name: "log2timeline (Full)",
    platforms: ["Windows", "Linux", "Darwin"],
    sourceTypes: ["FILE"],
    website: "https://plaso.readthedocs.io/",
  },
  {
    artifactPatterns: [/prefetch/i],
    category: "plaso",
    commandTemplate:
      'log2timeline.py --parsers prefetch --storage-file {{OUTPUT}}/prefetch.plaso "{{PATH}}"',
    description: "Parse Prefetch files with Plaso",
    id: "plaso-prefetch",
    name: "log2timeline (Prefetch)",
    platforms: ["Windows"],
    sourceTypes: ["FILE"],
    website: "https://plaso.readthedocs.io/",
  },
  {
    artifactPatterns: [/evtx/i, /event.*log/i],
    category: "plaso",
    commandTemplate:
      'log2timeline.py --parsers winevtx --storage-file {{OUTPUT}}/evtx.plaso "{{PATH}}"',
    description: "Parse Windows Event Logs with Plaso",
    id: "plaso-winevt",
    name: "log2timeline (WinEvt)",
    platforms: ["Windows"],
    sourceTypes: ["FILE"],
    website: "https://plaso.readthedocs.io/",
  },
  {
    artifactPatterns: [/registry/i, /ntuser/i, /system\b/i, /software\b/i],
    category: "plaso",
    commandTemplate:
      'log2timeline.py --parsers winreg --storage-file {{OUTPUT}}/registry.plaso "{{PATH}}"',
    description: "Parse Windows Registry with Plaso",
    id: "plaso-registry",
    name: "log2timeline (Registry)",
    platforms: ["Windows"],
    sourceTypes: ["REGISTRY_KEY", "REGISTRY_VALUE", "FILE"],
    website: "https://plaso.readthedocs.io/",
  },
  {
    category: "plaso",
    commandTemplate:
      "psort.py -o l2tcsv -w {{OUTPUT}}/timeline.csv {{OUTPUT}}/timeline.plaso",
    description: "Output Plaso timeline to CSV",
    id: "psort",
    name: "psort",
    platforms: ["Windows", "Linux", "Darwin"],
    sourceTypes: ["FILE"],
    website: "https://plaso.readthedocs.io/",
  },
  {
    category: "mac_apt",
    commandTemplate: 'mac_apt.py -i "{{PATH}}" -o "{{OUTPUT}}" ALL',
    description: "Run all mac_apt plugins",
    id: "mac_apt-all",
    name: "mac_apt (All Plugins)",
    platforms: ["Darwin"],
    sourceTypes: ["FILE"],
    website: "https://github.com/ydkhatri/mac_apt",
  },
  {
    artifactPatterns: [/safari/i],
    category: "mac_apt",
    commandTemplate: 'mac_apt.py -i "{{PATH}}" -o "{{OUTPUT}}" SAFARI',
    description: "Parse Safari browser artifacts",
    id: "mac_apt-safari",
    name: "mac_apt (Safari)",
    platforms: ["Darwin"],
    sourceTypes: ["FILE"],
    website: "https://github.com/ydkhatri/mac_apt",
  },
  {
    artifactPatterns: [/unified.*log/i, /\.tracev3/i],
    category: "mac_apt",
    commandTemplate: 'mac_apt.py -i "{{PATH}}" -o "{{OUTPUT}}" UNIFIEDLOGS',
    description: "Parse macOS Unified Logs",
    id: "mac_apt-unifiedlogs",
    name: "mac_apt (Unified Logs)",
    platforms: ["Darwin"],
    sourceTypes: ["FILE"],
    website: "https://github.com/ydkhatri/mac_apt",
  },
  {
    artifactPatterns: [/spotlight/i],
    category: "mac_apt",
    commandTemplate: 'mac_apt.py -i "{{PATH}}" -o "{{OUTPUT}}" SPOTLIGHT',
    description: "Parse Spotlight metadata",
    id: "mac_apt-spotlight",
    name: "mac_apt (Spotlight)",
    platforms: ["Darwin"],
    sourceTypes: ["FILE"],
    website: "https://github.com/ydkhatri/mac_apt",
  },
  {
    artifactPatterns: [/fsevent/i],
    category: "mac_apt",
    commandTemplate: 'mac_apt.py -i "{{PATH}}" -o "{{OUTPUT}}" FSEVENTS',
    description: "Parse FSEvents logs",
    id: "mac_apt-fsevents",
    name: "mac_apt (FSEvents)",
    platforms: ["Darwin"],
    sourceTypes: ["FILE"],
    website: "https://github.com/ydkhatri/mac_apt",
  },
  {
    artifactPatterns: [/memory/i, /\.raw$/i, /\.mem$/i, /hiberfil/i],
    category: "volatility",
    commandTemplate: 'vol.py -f "{{PATH}}" windows.pslist.PsList',
    description: "List running processes from memory",
    id: "vol-pslist",
    name: "Volatility (pslist)",
    platforms: ["Windows", "Linux", "Darwin"],
    sourceTypes: ["FILE"],
    website: "https://volatilityfoundation.org/",
  },
  {
    artifactPatterns: [/memory/i, /\.raw$/i, /\.mem$/i],
    category: "volatility",
    commandTemplate: 'vol.py -f "{{PATH}}" windows.netscan.NetScan',
    description: "Scan for network connections in memory",
    id: "vol-netscan",
    name: "Volatility (netscan)",
    platforms: ["Windows"],
    sourceTypes: ["FILE"],
    website: "https://volatilityfoundation.org/",
  },
  {
    artifactPatterns: [/memory/i, /\.raw$/i, /\.mem$/i],
    category: "volatility",
    commandTemplate: 'vol.py -f "{{PATH}}" windows.malfind.Malfind',
    description: "Find injected code in memory",
    id: "vol-malfind",
    name: "Volatility (malfind)",
    platforms: ["Windows"],
    sourceTypes: ["FILE"],
    website: "https://volatilityfoundation.org/",
  },
  {
    artifactPatterns: [/memory/i, /\.raw$/i, /\.mem$/i],
    category: "volatility",
    commandTemplate: 'vol.py -f "{{PATH}}" windows.cmdline.CmdLine',
    description: "Display process command-line arguments",
    id: "vol-cmdline",
    name: "Volatility (cmdline)",
    platforms: ["Windows"],
    sourceTypes: ["FILE"],
    website: "https://volatilityfoundation.org/",
  },
  {
    artifactPatterns: [/memory/i, /\.raw$/i, /\.mem$/i, /\.lime$/i],
    category: "volatility",
    commandTemplate: 'vol.py -f "{{PATH}}" linux.pslist.PsList',
    description: "List Linux processes from memory",
    id: "vol-linux-pslist",
    name: "Volatility Linux (pslist)",
    platforms: ["Linux"],
    sourceTypes: ["FILE"],
    website: "https://volatilityfoundation.org/",
  },
];

// Get tools that can handle a specific artifact
export function getToolsForArtifact(artifact: {
  name: string;
  supported_os?: string[];
  sources?: { type: string }[];
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
  return uniqueTools.toSorted(
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
    .replaceAll("{{PATH}}", path)
    .replaceAll("{{OUTPUT}}", output)
    .replaceAll("{{DRIVE}}", drive)
    .replaceAll("{{USER}}", user);
}
