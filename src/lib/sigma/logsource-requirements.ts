import * as yaml from "js-yaml";

import type { KapeTargetRef, Logsource } from "./sigma-mapping";
import { getRelatedKapeTargets } from "./sigma-mapping";
import type { AuditSubcategory } from "./windows-audit-policy";
import { findAuditSubcategories } from "./windows-audit-policy";

export interface SetupStep {
  title: string;
  detail?: string;
  command?: string;
  policyPath?: string[];
}

export interface TelemetrySource {
  id: string;
  name: string;
  channel: string;
  eventIds: number[];
  pipelines: string[];
  steps: SetupStep[];
}

export interface RuleTelemetry {
  logsource: Logsource;
  sources: TelemetrySource[];
  kapeTargets: KapeTargetRef[];
}

const SYSMON_CHANNEL = "Microsoft-Windows-Sysmon/Operational";
const SECURITY_CHANNEL = "Security";
const POWERSHELL_CHANNEL = "Microsoft-Windows-PowerShell/Operational";
const POWERSHELL_CORE_CHANNEL = "PowerShellCore/Operational";
const POWERSHELL_CLASSIC_CHANNEL = "Windows PowerShell";
const SYSMON_FOR_LINUX_CHANNEL = "syslog (Sysmon for Linux)";

const SYSMON_EVENT_IDS_BY_CATEGORY: Record<string, number[]> = {
  clipboard_capture: [24],
  create_remote_thread: [8],
  create_stream_hash: [15],
  dns_query: [22],
  driver_load: [6],
  file_block_executable: [27],
  file_block_shredding: [28],
  file_change: [2],
  file_delete: [23],
  file_delete_detected: [26],
  file_event: [11],
  file_executable_detected: [29],
  image_load: [7],
  network_connection: [3],
  pipe_created: [17, 18],
  process_access: [10],
  process_creation: [1],
  process_tampering: [25],
  process_termination: [5],
  raw_access_thread: [9],
  registry_add: [12],
  registry_delete: [12],
  registry_event: [12, 13, 14],
  registry_rename: [14],
  registry_set: [13],
  sysmon_error: [255],
  sysmon_status: [4, 16],
  wmi_event: [19, 20, 21],
};

const SYSMON_FOR_LINUX_CATEGORIES = new Set([
  "file_delete",
  "file_event",
  "network_connection",
  "process_creation",
  "process_termination",
  "raw_access_thread",
]);

const WINDOWS_CHANNEL_BY_SERVICE: Record<string, string[]> = {
  "appxdeployment-server": [
    "Microsoft-Windows-AppXDeploymentServer/Operational",
  ],
  "appxpackaging-om": ["Microsoft-Windows-AppxPackaging/Operational"],
  "appmodel-runtime": ["Microsoft-Windows-AppModel-Runtime/Admin"],
  application: ["Application"],
  applocker: [
    "Microsoft-Windows-AppLocker/MSI and Script",
    "Microsoft-Windows-AppLocker/EXE and DLL",
    "Microsoft-Windows-AppLocker/Packaged app-Deployment",
    "Microsoft-Windows-AppLocker/Packaged app-Execution",
  ],
  "bits-client": ["Microsoft-Windows-Bits-Client/Operational"],
  bitlocker: ["Microsoft-Windows-BitLocker/BitLocker Management"],
  capi2: ["Microsoft-Windows-CAPI2/Operational"],
  "certificateservicesclient-lifecycle-system": [
    "Microsoft-Windows-CertificateServicesClient-Lifecycle-System/Operational",
  ],
  "codeintegrity-operational": ["Microsoft-Windows-CodeIntegrity/Operational"],
  dhcp: ["Microsoft-Windows-DHCP-Server/Operational"],
  "diagnosis-scripted": ["Microsoft-Windows-Diagnosis-Scripted/Operational"],
  "dns-client": ["Microsoft-Windows-DNS Client Events/Operational"],
  "dns-server": ["DNS Server"],
  "dns-server-analytic": ["Microsoft-Windows-DNS-Server/Analytical"],
  "dns-server-audit": ["Microsoft-Windows-DNS-Server/Audit"],
  "driver-framework": [
    "Microsoft-Windows-DriverFrameworks-UserMode/Operational",
  ],
  "firewall-as": [
    "Microsoft-Windows-Windows Firewall With Advanced Security/Firewall",
  ],
  ldap_debug: ["Microsoft-Windows-LDAP-Client/Debug"],
  "lsa-server": ["Microsoft-Windows-LSA/Operational"],
  "microsoft-servicebus-client": ["Microsoft-ServiceBus-Client"],
  "msexchange-management": ["MSExchange Management"],
  ntlm: ["Microsoft-Windows-NTLM/Operational"],
  openssh: ["OpenSSH/Operational"],
  "printservice-admin": ["Microsoft-Windows-PrintService/Admin"],
  "printservice-operational": ["Microsoft-Windows-PrintService/Operational"],
  "security-mitigations": [
    "Microsoft-Windows-Security-Mitigations/Kernel Mode",
    "Microsoft-Windows-Security-Mitigations/User Mode",
  ],
  "shell-core": ["Microsoft-Windows-Shell-Core/Operational"],
  "smbclient-security": ["Microsoft-Windows-SmbClient/Security"],
  system: ["System"],
  taskscheduler: ["Microsoft-Windows-TaskScheduler/Operational"],
  "terminalservices-localsessionmanager": [
    "Microsoft-Windows-TerminalServices-LocalSessionManager/Operational",
  ],
  vhdmp: ["Microsoft-Windows-VHDMP/Operational"],
  windefend: ["Microsoft-Windows-Windows Defender/Operational"],
  wmi: ["Microsoft-Windows-WMI-Activity/Operational"],
};

const CHANNELS_DISABLED_BY_DEFAULT = new Set([
  "Microsoft-Windows-CAPI2/Operational",
  "Microsoft-Windows-DNS Client Events/Operational",
  "Microsoft-Windows-DriverFrameworks-UserMode/Operational",
  "Microsoft-Windows-TaskScheduler/Operational",
]);

const ANALYTIC_OR_DEBUG_CHANNELS = new Set([
  "Microsoft-Windows-DNS-Server/Analytical",
  "Microsoft-Windows-LDAP-Client/Debug",
]);

const SUBCATEGORIES_NEEDING_SACL = new Set([
  "Directory Service Access",
  "Directory Service Changes",
  "File System",
  "Kernel Object",
  "Registry",
]);

const AUDIT_POLICY_ROOT = ["Advanced Audit Policy Configuration"];

const PROCESS_CREATION_EVENT_ID = 4688;
const REGISTRY_VALUE_MODIFIED_EVENT_ID = 4657;

const SYSMON_INSTALL_STEP: SetupStep = {
  command: "sysmon64.exe -accepteula -i sysmonconfig.xml",
  detail: "Many configs drop some event types. sysmon-modular keeps them.",
  title: "Install Sysmon",
};

const COMMAND_LINE_POLICY_STEP: SetupStep = {
  detail: "Without it, 4688 has no CommandLine field.",
  policyPath: [
    "Computer Configuration",
    "Administrative Templates",
    "System",
    "Audit Process Creation",
    "Include command line in process creation events: Enabled",
  ],
  title: "Include the command line in event 4688",
};

const POWERSHELL_MODULE_LOGGING_STEP: SetupStep = {
  detail:
    "Set module names to *. PowerShell 7 has the same setting under PowerShell Core.",
  policyPath: [
    "Computer Configuration",
    "Administrative Templates",
    "Windows Components",
    "Windows PowerShell",
    "Turn on Module Logging: Enabled",
  ],
  title: "Turn on PowerShell module logging",
};

const POWERSHELL_SCRIPT_BLOCK_LOGGING_STEP: SetupStep = {
  detail: "PowerShell 7 has the same setting under PowerShell Core.",
  policyPath: [
    "Computer Configuration",
    "Administrative Templates",
    "Windows Components",
    "Windows PowerShell",
    "Turn on PowerShell Script Block Logging: Enabled",
  ],
  title: "Turn on PowerShell script block logging",
};

const ENABLED_BY_DEFAULT_STEP: SetupStep = {
  detail: "No setup needed.",
  title: "Logged by default",
};

function auditPolicyDetail(
  subcategory: AuditSubcategory,
  sharedEventIds: number[]
): string | undefined {
  const notes: string[] = [];
  const sharedHere = subcategory.eventIds.filter((eventId) =>
    sharedEventIds.includes(eventId)
  );
  if (sharedHere.length > 0) {
    notes.push(
      `Event ${sharedHere.join(", ")} also comes from other subcategories. Pick the one for your object type.`
    );
  }
  if (SUBCATEGORIES_NEEDING_SACL.has(subcategory.subcategory)) {
    notes.push("Needs a SACL on the objects to watch.");
  }
  return notes.length > 0 ? notes.join(" ") : undefined;
}

function auditPolicyStep(
  subcategory: AuditSubcategory,
  sharedEventIds: number[]
): SetupStep {
  return {
    command: `auditpol /set /subcategory:"${subcategory.guid}" /success:enable /failure:enable`,
    detail: auditPolicyDetail(subcategory, sharedEventIds),
    policyPath: [
      ...AUDIT_POLICY_ROOT,
      subcategory.category,
      `Audit ${subcategory.subcategory}: Success and Failure`,
    ],
    title: `Audit ${subcategory.subcategory}`,
  };
}

function eventIdsInSeveralSubcategories(eventIds: number[]): number[] {
  return eventIds.filter(
    (eventId) => findAuditSubcategories(eventId).length > 1
  );
}

function uniqueSubcategories(eventIds: number[]): AuditSubcategory[] {
  const byGuid = new Map<string, AuditSubcategory>();
  for (const eventId of eventIds) {
    for (const subcategory of findAuditSubcategories(eventId)) {
      byGuid.set(subcategory.guid, subcategory);
    }
  }
  return [...byGuid.values()];
}

function securityAuditSource(
  eventIds: number[],
  pipelines: string[],
  extraSteps: SetupStep[] = []
): TelemetrySource {
  const sharedEventIds = eventIdsInSeveralSubcategories(eventIds);
  const subcategorySteps = uniqueSubcategories(eventIds).map((subcategory) =>
    auditPolicyStep(subcategory, sharedEventIds)
  );
  const commandLineSteps = eventIds.includes(PROCESS_CREATION_EVENT_ID)
    ? [COMMAND_LINE_POLICY_STEP]
    : [];
  const fallbackSteps: SetupStep[] =
    subcategorySteps.length === 0
      ? [
          {
            detail: "Add an EventID to the rule to see which one.",
            command: "auditpol /get /category:*",
            title: "Turn on the matching audit subcategory",
          },
        ]
      : [];
  return {
    channel: SECURITY_CHANNEL,
    eventIds,
    id: "security",
    name: "Windows Security auditing",
    pipelines,
    steps: [
      ...subcategorySteps,
      ...commandLineSteps,
      ...fallbackSteps,
      ...extraSteps,
    ],
  };
}

function sysmonSource(
  eventIds: number[],
  pipelines: string[]
): TelemetrySource {
  return {
    channel: SYSMON_CHANNEL,
    eventIds,
    id: "sysmon",
    name: "Sysmon",
    pipelines,
    steps: [SYSMON_INSTALL_STEP],
  };
}

function powershellSources(
  eventIds: number[],
  steps: SetupStep[],
  pipelines: string[]
): TelemetrySource[] {
  return [
    {
      channel: POWERSHELL_CHANNEL,
      eventIds,
      id: "powershell-5",
      name: "Windows PowerShell 5.1",
      pipelines,
      steps,
    },
    {
      channel: POWERSHELL_CORE_CHANNEL,
      eventIds,
      id: "powershell-7",
      name: "PowerShell 7",
      pipelines,
      steps,
    },
  ];
}

function powershellClassicSource(
  eventIds: number[],
  steps: SetupStep[]
): TelemetrySource {
  return {
    channel: POWERSHELL_CLASSIC_CHANNEL,
    eventIds,
    id: "powershell-classic",
    name: "Windows PowerShell (classic log)",
    pipelines: ["windows-logsources"],
    steps,
  };
}

function windowsCategorySources(category: string): TelemetrySource[] {
  switch (category) {
    case "ps_module": {
      return powershellSources(
        [4103],
        [POWERSHELL_MODULE_LOGGING_STEP],
        ["windows-logsources"]
      );
    }
    case "ps_script": {
      return powershellSources(
        [4104],
        [POWERSHELL_SCRIPT_BLOCK_LOGGING_STEP],
        ["windows-logsources"]
      );
    }
    case "ps_classic_start": {
      return [powershellClassicSource([400], [ENABLED_BY_DEFAULT_STEP])];
    }
    case "ps_classic_provider_start": {
      return [powershellClassicSource([600], [ENABLED_BY_DEFAULT_STEP])];
    }
    case "ps_classic_script": {
      return [powershellClassicSource([800], [POWERSHELL_MODULE_LOGGING_STEP])];
    }
    default: {
      break;
    }
  }

  const sources: TelemetrySource[] = [];
  const sysmonEventIds = SYSMON_EVENT_IDS_BY_CATEGORY[category];
  if (sysmonEventIds) {
    sources.push(sysmonSource(sysmonEventIds, ["sysmon"]));
  }
  if (category === "process_creation") {
    sources.push(
      securityAuditSource([PROCESS_CREATION_EVENT_ID], ["windows-audit"])
    );
  }
  if (["registry_add", "registry_event", "registry_set"].includes(category)) {
    sources.push(
      securityAuditSource([REGISTRY_VALUE_MODIFIED_EVENT_ID], ["windows-audit"])
    );
  }
  return sources;
}

function channelSetupSteps(channel: string): SetupStep[] {
  if (ANALYTIC_OR_DEBUG_CHANNELS.has(channel)) {
    return [
      {
        command: `wevtutil sl "${channel}" /e:true`,
        detail: "Hidden analytic channel. Off by default and noisy.",
        title: "Enable the channel",
      },
    ];
  }
  if (CHANNELS_DISABLED_BY_DEFAULT.has(channel)) {
    return [
      {
        command: `wevtutil sl "${channel}" /e:true`,
        detail: "Off by default.",
        title: "Enable the channel",
      },
    ];
  }
  return [
    {
      command: `wevtutil gl "${channel}"`,
      detail: "Look for enabled: true.",
      title: "Check the channel is on",
    },
  ];
}

const NTLM_AUDIT_STEP: SetupStep = {
  detail: "Empty until NTLM auditing is on.",
  policyPath: [
    "Computer Configuration",
    "Windows Settings",
    "Security Settings",
    "Local Policies",
    "Security Options",
    "Network security: Restrict NTLM: Audit Incoming NTLM Traffic: Enable auditing for all accounts",
  ],
  title: "Turn on NTLM auditing",
};

function windowsServiceSources(
  service: string,
  eventIds: number[]
): TelemetrySource[] {
  switch (service) {
    case "security": {
      return [securityAuditSource(eventIds, ["windows-logsources"])];
    }
    case "sysmon": {
      return [sysmonSource(eventIds, ["windows-logsources"])];
    }
    case "powershell": {
      return powershellSources(
        eventIds,
        [POWERSHELL_MODULE_LOGGING_STEP, POWERSHELL_SCRIPT_BLOCK_LOGGING_STEP],
        ["windows-logsources"]
      );
    }
    case "powershell-classic": {
      return [powershellClassicSource(eventIds, [ENABLED_BY_DEFAULT_STEP])];
    }
    case "system":
    case "application": {
      return WINDOWS_CHANNEL_BY_SERVICE[service].map((channel) => ({
        channel,
        eventIds,
        id: service,
        name: channel,
        pipelines: ["windows-logsources"],
        steps: [ENABLED_BY_DEFAULT_STEP],
      }));
    }
    default: {
      break;
    }
  }

  const channels = WINDOWS_CHANNEL_BY_SERVICE[service] ?? [];
  return channels.map((channel) => ({
    channel,
    eventIds,
    id: `${service}-${channel}`,
    name: channel,
    pipelines: ["windows-logsources"],
    steps: service === "ntlm" ? [NTLM_AUDIT_STEP] : channelSetupSteps(channel),
  }));
}

function linuxSources(
  logsource: Logsource,
  eventIds: number[]
): TelemetrySource[] {
  const { category, service } = logsource;
  const sources: TelemetrySource[] = [];
  if (category && SYSMON_FOR_LINUX_CATEGORIES.has(category)) {
    sources.push({
      channel: SYSMON_FOR_LINUX_CHANNEL,
      eventIds: SYSMON_EVENT_IDS_BY_CATEGORY[category] ?? [],
      id: "sysmon-linux",
      name: "Sysmon for Linux",
      pipelines: [],
      steps: [
        {
          command: "sysmon -accepteula -i sysmonconfig.xml",
          detail: "Events go to syslog.",
          title: "Install Sysmon for Linux",
        },
      ],
    });
  }
  if (category === "process_creation") {
    sources.push({
      channel: "/var/log/audit/audit.log",
      eventIds: [],
      id: "auditd-execve",
      name: "auditd (execve)",
      pipelines: [],
      steps: [
        {
          command:
            "auditctl -a always,exit -F arch=b64 -S execve -k process_creation",
          detail: "Add it to /etc/audit/rules.d/ to keep it after reboot.",
          title: "Log every execve system call",
        },
      ],
    });
  }
  if (service === "auditd") {
    sources.push({
      channel: "/var/log/audit/audit.log",
      eventIds,
      id: "auditd",
      name: "auditd",
      pipelines: [],
      steps: [
        {
          command: "auditctl -l",
          detail: "Add -w or -a rules for what the detection matches.",
          title: "Check the loaded audit rules",
        },
      ],
    });
  }
  return sources;
}

const EVENT_ID_FIELD_PATTERN = /^EventID(?:\|.*)?$/u;

function collectEventIds(node: unknown, found: Set<number>): void {
  if (Array.isArray(node)) {
    for (const item of node) {
      collectEventIds(item, found);
    }
    return;
  }
  if (!node || typeof node !== "object") {
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    if (EVENT_ID_FIELD_PATTERN.test(key)) {
      const values = Array.isArray(value) ? value : [value];
      for (const candidate of values) {
        const eventId = Number(candidate);
        if (Number.isInteger(eventId)) {
          found.add(eventId);
        }
      }
    } else {
      collectEventIds(value, found);
    }
  }
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

export function parseRuleLogging(
  ruleYaml: string
): { logsource: Logsource; eventIds: number[] } | null {
  try {
    const parsed = yaml.load(ruleYaml) as Record<string, unknown> | null;
    const rawLogsource = parsed?.logsource;
    if (!rawLogsource || typeof rawLogsource !== "object") {
      return null;
    }
    const fields = rawLogsource as Record<string, unknown>;
    const logsource: Logsource = {
      category: readString(fields.category),
      product: readString(fields.product),
      service: readString(fields.service),
    };
    const eventIds = new Set<number>();
    collectEventIds(parsed?.detection, eventIds);
    return {
      eventIds: [...eventIds].toSorted((a, b) => a - b),
      logsource,
    };
  } catch {
    return null;
  }
}

function telemetrySourcesFor(
  logsource: Logsource,
  eventIds: number[]
): TelemetrySource[] {
  if (logsource.product === "windows") {
    if (logsource.category) {
      return windowsCategorySources(logsource.category);
    }
    if (logsource.service) {
      return windowsServiceSources(logsource.service, eventIds);
    }
    return [];
  }
  if (logsource.product === "linux") {
    return linuxSources(logsource, eventIds);
  }
  return [];
}

export function describeRuleTelemetry(ruleYaml: string): RuleTelemetry | null {
  const parsed = parseRuleLogging(ruleYaml);
  if (!parsed) {
    return null;
  }
  return {
    kapeTargets: getRelatedKapeTargets(parsed.logsource),
    logsource: parsed.logsource,
    sources: telemetrySourcesFor(parsed.logsource, parsed.eventIds),
  };
}
