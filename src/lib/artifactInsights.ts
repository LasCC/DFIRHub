import { getResolvedEntries, loadAllTargets } from "./kapefiles";
import type { KapeTarget } from "./kapefiles";
import { loadAllModules } from "./kapeModules";
import type { KapeModule } from "./kapeModules";

export interface ArtifactInsight {
  proves: string;
  tip?: string;
  parserModules: string[];
}

const BROWSER_CHROMIUM: ArtifactInsight = {
  parserModules: [
    "ObsidianForensics_Hindsight",
    "SQLECmd",
    "NirSoft_BrowsingHistoryView",
  ],
  proves:
    "Websites visited and when, files downloaded with their source URL, searches typed, saved logins and cookies, and installed extensions.",
  tip: "History, Cookies and Login Data are SQLite databases. Copy the -wal files too, or recent rows are missing.",
};

const REMOTE_ACCESS_LOGS =
  "Remote access sessions: when they started and ended, the remote ID or IP address that connected, and files transferred during the session.";

const INSIGHTS: Record<string, ArtifactInsight> = {
  activedirectoryntds: {
    parserModules: [],
    proves:
      "Every domain account, group membership, password hash and last logon time. Attackers steal ntds.dit for offline cracking.",
    tip: "Collect the SYSTEM hive too: it holds the boot key needed to decrypt the hashes.",
  },
  amcache: {
    parserModules: ["AmcacheParser"],
    proves:
      "Programs present on the system with their full path, SHA1 hash, publisher and first-seen time, plus installed applications and drivers.",
    tip: "An Amcache entry shows a file existed. Pair it with Prefetch or event 4688 to prove it ran.",
  },
  anydesk: {
    parserModules: [],
    proves: `${REMOTE_ACCESS_LOGS} ad.trace also logs the public IP of the connecting client.`,
    tip: 'Search ad.trace for "Logged in from" and connection_trace.txt for incoming session IDs.',
  },
  appcompatpca: {
    parserModules: [],
    proves:
      "Programs launched on Windows 11 22H2 and later, with the full path and the time each one ran.",
    tip: "PcaAppLaunchDic.txt is plain text: one line per program with a UTC timestamp.",
  },
  bits: {
    parserModules: [],
    proves:
      "Background Intelligent Transfer Service jobs: the URLs a host downloaded from and the command run after each job. Malware uses BITS for download and persistence.",
  },
  bravebrowser: BROWSER_CHROMIUM,
  certutil: {
    parserModules: [],
    proves:
      "Files fetched with certutil -urlcache, a common living-off-the-land download technique, with the source URL and time.",
  },
  chatgpt: {
    parserModules: [],
    proves:
      "ChatGPT Desktop use: cached conversations, prompts and settings stored by the app for each user.",
    tip: "Conversation data sits in LevelDB and IndexedDB folders. Parse them with a LevelDB reader.",
  },
  chrome: BROWSER_CHROMIUM,
  chromium: BROWSER_CHROMIUM,
  edge: BROWSER_CHROMIUM,
  edgechromium: BROWSER_CHROMIUM,
  eventlogs: {
    parserModules: ["EvtxECmd", "Hayabusa", "Chainsaw"],
    proves:
      "Logons and logoffs, process creation, service installs, scheduled tasks, PowerShell activity, account changes and log clearing.",
    tip: "Run Hayabusa or Chainsaw first for a fast triage, then EvtxECmd for a full timeline.",
  },
  "eventlogs-rdp": {
    parserModules: ["EvtxECmd_RDP"],
    proves:
      "Remote Desktop logons to and from this host: source IP address, account name, session connect, reconnect and disconnect times.",
  },
  filezillaclient: {
    parserModules: [],
    proves:
      "FTP and SFTP servers the user connected to, saved credentials and the transfer queue. Strong evidence of data exfiltration.",
  },
  firefox: {
    parserModules: ["SQLECmd", "NirSoft_BrowsingHistoryView"],
    proves:
      "Websites visited and when, downloads, form history, cookies and saved logins.",
    tip: "places.sqlite holds history and downloads. Copy the -wal file too.",
  },
  hostsfile: {
    parserModules: [],
    proves:
      "Local DNS overrides. Malware edits the hosts file to block security updates or redirect domains.",
  },
  internetexplorer: {
    parserModules: ["NirSoft_BrowsingHistoryView"],
    proves:
      "Web history, and file:// access to local and network files, stored in WebCacheV01.dat.",
  },
  j: {
    parserModules: ["MFTECmd_$J"],
    proves:
      "File system changes: files created, renamed, overwritten and deleted, with a timestamp for each change.",
    tip: "The USN journal rolls over quickly on busy systems. Collect it early.",
  },
  jumplists: {
    parserModules: ["JLECmd"],
    proves:
      "Files and folders each application opened, including files on removable and network drives, with open times.",
  },
  lnkfilesandjumplists: {
    parserModules: ["LECmd", "JLECmd"],
    proves:
      "Files and folders the user opened, their original path, volume serial number and the timestamps of the target file.",
    tip: "LNK files stay after the target file is deleted, which makes them good evidence of access.",
  },
  logfile: {
    parserModules: ["NTFSLogTracker_$LogFile"],
    proves:
      "Recent NTFS transactions: file creation, renames and deletions over the last few hours of activity.",
  },
  meshagent: {
    parserModules: [],
    proves: REMOTE_ACCESS_LOGS,
  },
  mft: {
    parserModules: ["MFTECmd_$MFT"],
    proves:
      "Every file and folder on the volume with its created, modified, accessed and MFT change times. The base of any file system timeline.",
    tip: "Compare $STANDARD_INFORMATION and $FILE_NAME times to find timestomping.",
  },
  microsoftteams: {
    parserModules: ["TeamsParser"],
    proves:
      "Teams messages, calls, meetings and contacts cached for each user.",
  },
  "notepad-windows": {
    parserModules: ["WindowsNotepadParser"],
    proves:
      "Text typed in Windows 11 Notepad tabs, including text that was never saved to a file.",
  },
  onedrive_metadata: {
    parserModules: ["OneDriveExplorer"],
    proves:
      "Files synced to OneDrive, including files no longer on disk, with folder structure and sync account.",
  },
  opera: BROWSER_CHROMIUM,
  powershellconsole: {
    parserModules: [],
    proves:
      "Commands typed in interactive PowerShell sessions, for each user, from ConsoleHost_history.txt.",
    tip: "The file is plain text and has no timestamps. Use the file modified time for the last command.",
  },
  powershelltranscripts: {
    parserModules: [],
    proves:
      "Full PowerShell session transcripts when transcription is on: every command, its output, the user and the start time.",
  },
  prefetch: {
    parserModules: ["PECmd"],
    proves:
      "Program execution: the executable name, how many times it ran, up to the last eight run times (one on Windows 7 and earlier), and the files and folders it loaded.",
    tip: "Prefetch is off by default on Windows Server. An empty folder on a workstation can mean it was turned off: check EnablePrefetcher in the SYSTEM hive.",
  },
  protonvpn: {
    parserModules: [],
    proves:
      "VPN use: connection times, the VPN servers selected and app settings for each user.",
  },
  rdpcache: {
    parserModules: ["BMC-Tools_RDPBitmapCacheParser"],
    proves:
      "Image tiles of what the user saw on remote hosts during outbound RDP sessions.",
  },
  recentfilecache: {
    parserModules: ["RecentFileCacheParser"],
    proves: "Executables recently run on Windows 7 and Server 2008 R2.",
  },
  recyclebin_infofiles: {
    parserModules: ["RBCmd"],
    proves:
      "Files the user deleted to the Recycle Bin: original path, size and deletion time.",
  },
  registryhivessystem: {
    parserModules: [
      "RECmd_DFIRBatch",
      "AppCompatCacheParser",
      "RegRipper_SYSTEM",
    ],
    proves:
      "System configuration and activity: USB devices, services, autoruns, ShimCache program entries, network interfaces, time zone and installed software.",
  },
  registryhivesuser: {
    parserModules: ["RECmd_DFIRBatch", "SBECmd", "RegRipper_NTUser"],
    proves:
      "User activity: programs run (UserAssist), folders browsed (ShellBags), recent documents, typed paths and run dialog history.",
  },
  rustdesk: {
    parserModules: [],
    proves: REMOTE_ACCESS_LOGS,
  },
  scheduledtasks: {
    parserModules: ["PowerShell_ParseScheduledTasks"],
    proves:
      "Scheduled tasks used for persistence: the command each task runs, its trigger and the account it runs as.",
  },
  splashtop: {
    parserModules: [],
    proves: REMOTE_ACCESS_LOGS,
  },
  srum: {
    parserModules: ["SrumECmd"],
    proves:
      "Per-application network bytes sent and received, foreground time and energy use, kept for about 30 to 60 days.",
    tip: "SRUDB.dat is often dirty. Repair it with esentutl before parsing, and collect the SOFTWARE hive.",
  },
  sum: {
    parserModules: ["SumECmd"],
    proves:
      "On Windows Server: which users and client IP addresses accessed server roles such as file shares and RDP, by day.",
  },
  teamviewerlogs: {
    parserModules: [],
    proves: `${REMOTE_ACCESS_LOGS} connections_incoming.txt lists partner IDs and session start and end times.`,
  },
  thumbcache: {
    parserModules: ["ThumbCacheViewer"],
    proves:
      "Thumbnails of pictures, videos and documents viewed in Explorer, often still present after the original file is deleted.",
  },
  ultraviewer: {
    parserModules: [],
    proves: REMOTE_ACCESS_LOGS,
  },
  vivaldi: BROWSER_CHROMIUM,
  windowscopilotrecall: {
    parserModules: [],
    proves:
      "Periodic screenshots of user activity with the text recognised on screen and the application in focus.",
  },
  windowsfirewall: {
    parserModules: [],
    proves:
      "Allowed and dropped network connections when firewall logging is on, plus firewall rules added by users or malware.",
  },
  windowstimeline: {
    parserModules: ["WxTCmd"],
    proves:
      "Applications used and files opened, with focus durations, from the Windows 10 Timeline database.",
  },
  winscp: {
    parserModules: [],
    proves:
      "SFTP and SCP sessions: saved hosts, user names and transfer logs. Strong evidence of data exfiltration.",
  },
};

let validatedInsights: Map<string, ArtifactInsight> | null = null;

function validateInsightReferences(
  knownModules: Set<string>,
  knownSlugs: Set<string>
): void {
  for (const [slug, insight] of Object.entries(INSIGHTS)) {
    if (!knownSlugs.has(slug)) {
      throw new Error(
        `Artifact insight references unknown target slug "${slug}"`
      );
    }
    for (const moduleName of insight.parserModules) {
      if (!knownModules.has(moduleName)) {
        throw new Error(
          `Artifact insight "${slug}" references unknown KAPE module "${moduleName}"`
        );
      }
    }
  }
}

function getValidatedInsights(): Map<string, ArtifactInsight> {
  if (!validatedInsights) {
    validateInsightReferences(
      new Set(loadAllModules().map((module) => module.name)),
      new Set(loadAllTargets().map((target) => target.slug))
    );
    validatedInsights = new Map(Object.entries(INSIGHTS));
  }
  return validatedInsights;
}

export function getArtifactInsight(slug: string): ArtifactInsight | undefined {
  return getValidatedInsights().get(slug);
}

export function getParserModules(insight: ArtifactInsight): KapeModule[] {
  const modulesByName = new Map(
    loadAllModules().map((module) => [module.name, module])
  );
  return insight.parserModules.flatMap((name) => {
    const found = modulesByName.get(name);
    return found ? [found] : [];
  });
}

const THIN_ARTIFACT_MAX_PATHS = 2;

export function isThinArtifact(target: KapeTarget): boolean {
  if (target.isCompound || getArtifactInsight(target.slug)) {
    return false;
  }
  const hasDocumentation = target.documentation.length > 0;
  const pathCount = getResolvedEntries(target).length;
  return !hasDocumentation && pathCount <= THIN_ARTIFACT_MAX_PATHS;
}
