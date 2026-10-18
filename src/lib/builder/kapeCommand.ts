import { hasSecrets } from "./config";
import type { KapeConfig } from "./config";

export type IssueLevel = "error" | "warning" | "info";

export interface ConfigIssue {
  level: IssueLevel;
  message: string;
}

const NEEDS_QUOTES = /[\s&|<>^()]/;
const TRAILING_BACKSLASHES = /\\+$/;
const DRIVE_PREFIX = /^([A-Za-z]):?(\\|$)/;
const FILE_EXTENSION_OR_PATH = /[\\/.]/;
const DEFAULT_SFTP_PORT = "22";
const DEFAULT_S3_PROVIDER = "spAmazonS3";

export function quoteArgument(value: string): string {
  if (value === "") {
    return '""';
  }
  if (!NEEDS_QUOTES.test(value)) {
    return value;
  }
  return `"${value.replace(TRAILING_BACKSLASHES, "")}"`;
}

function option(flag: string, value?: string): string[] {
  if (value === undefined) {
    return [`--${flag}`];
  }
  return [`--${flag}`, quoteArgument(value)];
}

function optionalValue(flag: string, value: string): string[] {
  const trimmed = value.trim();
  return trimmed ? option(flag, trimmed) : [];
}

function flag(name: string, enabled: boolean): string[] {
  return enabled ? option(name) : [];
}

function hasTargets(config: KapeConfig): boolean {
  return config.targets.length > 0;
}

function hasModules(config: KapeConfig): boolean {
  return config.modules.length > 0;
}

function usesContainer(config: KapeConfig): boolean {
  return hasTargets(config) && config.container !== "none";
}

function zipsSomething(config: KapeConfig): boolean {
  const zipsVirtualDisk =
    usesContainer(config) && config.container !== "zip" && config.zipContainer;
  const zipsContainer = usesContainer(config) && config.container === "zip";
  const zipsModuleOutput = hasModules(config) && config.zipModules;
  return zipsVirtualDisk || zipsContainer || zipsModuleOutput;
}

function canTransfer(config: KapeConfig): boolean {
  return usesContainer(config) || (hasModules(config) && config.zipModules);
}

function targetArguments(config: KapeConfig): string[] {
  if (!hasTargets(config)) {
    return [];
  }
  return [
    ...option("tsource", config.tsource.trim()),
    ...option("tdest", config.tdest.trim()),
    ...option("target", config.targets.join(",")),
    ...flag("vss", config.vss),
    ...flag("tflush", config.tflush),
    ...(config.deduplicate ? [] : option("tdd", "false")),
  ];
}

function moduleArguments(config: KapeConfig): string[] {
  if (!hasModules(config)) {
    return [];
  }
  const moduleSource = config.msource.trim();
  return [
    ...(moduleSource ? option("msource", moduleSource) : []),
    ...option("mdest", config.mdest.trim()),
    ...option("module", config.modules.join(",")),
    ...flag("mflush", config.mflush),
    ...optionalValue("mef", config.exportFormat),
    ...flag("zm", config.zipModules),
  ];
}

function containerArguments(config: KapeConfig): string[] {
  if (!usesContainer(config)) {
    return [];
  }
  const containerFlag = option(config.container, config.containerName.trim());
  const zipVirtualDisk =
    config.container !== "zip" && !config.zipContainer
      ? option("zv", "false")
      : [];
  return [...containerFlag, ...zipVirtualDisk];
}

function compressionArguments(config: KapeConfig): string[] {
  return zipsSomething(config) ? optionalValue("zpw", config.zipPassword) : [];
}

function sftpArguments(config: KapeConfig): string[] {
  const port = config.sftpPort.trim();
  return [
    ...optionalValue("scs", config.sftpServer),
    ...(port && port !== DEFAULT_SFTP_PORT ? option("scp", port) : []),
    ...optionalValue("scu", config.sftpUser),
    ...optionalValue("scpw", config.sftpPassword),
    ...optionalValue("scd", config.sftpDirectory),
    ...optionalValue("scc", config.transferComment),
  ];
}

function s3Arguments(config: KapeConfig): string[] {
  const provider = config.s3Provider.trim();
  return [
    ...(provider && provider !== DEFAULT_S3_PROVIDER
      ? option("s3p", provider)
      : []),
    ...optionalValue("s3r", config.s3Region),
    ...optionalValue("s3b", config.s3Bucket),
    ...optionalValue("s3k", config.s3AccessKey),
    ...optionalValue("s3s", config.s3Secret),
    ...optionalValue("s3st", config.s3SessionToken),
    ...optionalValue("s3kp", config.s3KeyPrefix),
    ...optionalValue("s3c", config.transferComment),
  ];
}

function transferArguments(config: KapeConfig): string[] {
  if (config.transfer === "none" || !canTransfer(config)) {
    return [];
  }
  const keepLocal = flag("rlc", config.keepLocalCopy);
  switch (config.transfer) {
    case "sftp": {
      return [...sftpArguments(config), ...keepLocal];
    }
    case "s3": {
      return [...s3Arguments(config), ...keepLocal];
    }
    case "s3url": {
      return [...optionalValue("s3url", config.s3Url), ...keepLocal];
    }
    case "azure": {
      return [
        ...optionalValue("asu", config.azureSasUri),
        ...optionalValue("asc", config.transferComment),
        ...keepLocal,
      ];
    }
    default: {
      return [];
    }
  }
}

function diagnosticArguments(config: KapeConfig): string[] {
  return [
    ...flag("debug", config.debug),
    ...flag("trace", config.trace),
    ...flag("gui", config.gui),
  ];
}

export function buildKapeArguments(config: KapeConfig): string[] {
  return [
    ...targetArguments(config),
    ...moduleArguments(config),
    ...containerArguments(config),
    ...compressionArguments(config),
    ...transferArguments(config),
    ...diagnosticArguments(config),
  ];
}

export function formatKapeCommand(config: KapeConfig): string {
  return [".\\kape.exe", ...buildKapeArguments(config)].join(" ");
}

export function formatKapeBatchFile(config: KapeConfig): string {
  const batchArguments = [
    ...buildKapeArguments(config),
    ...flag("ul", config.linear),
    ...flag("cu", config.cleanup),
  ];
  return `${batchArguments.join(" ")}\r\n`;
}

function driveLetter(value: string): string | undefined {
  return value.trim().match(DRIVE_PREFIX)?.[1]?.toUpperCase();
}

function selectionIssues(config: KapeConfig): ConfigIssue[] {
  if (!(hasTargets(config) || hasModules(config))) {
    return [{ level: "error", message: "Pick at least one target or module." }];
  }
  return [];
}

function targetIssues(config: KapeConfig): ConfigIssue[] {
  if (!hasTargets(config)) {
    return config.vss
      ? [
          {
            level: "warning",
            message: "--vss only applies to target collection. It is ignored.",
          },
        ]
      : [];
  }
  const issues: ConfigIssue[] = [];
  if (!config.tsource.trim()) {
    issues.push({
      level: "error",
      message: "Set a target source (--tsource), for example C:.",
    });
  }
  if (!config.tdest.trim()) {
    issues.push({
      level: "error",
      message: "Set a target destination (--tdest).",
    });
  }
  const sourceDrive = driveLetter(config.tsource);
  if (sourceDrive && sourceDrive === driveLetter(config.tdest)) {
    issues.push({
      level: "warning",
      message: `--tdest is on the source drive ${sourceDrive}:. Writing evidence to the drive you collect from can overwrite deleted data. Use an external drive or a UNC share.`,
    });
  }
  if (config.tflush) {
    issues.push({
      level: "info",
      message:
        "--tflush deletes the --tdest folder before the collection starts.",
    });
  }
  return issues;
}

function moduleIssues(config: KapeConfig): ConfigIssue[] {
  if (!hasModules(config)) {
    return [];
  }
  const issues: ConfigIssue[] = [];
  if (!config.mdest.trim()) {
    issues.push({
      level: "error",
      message: "Set a module destination (--mdest).",
    });
  }
  if (!(hasTargets(config) || config.msource.trim())) {
    issues.push({
      level: "error",
      message:
        "A module-only run needs a module source (--msource). Use C:\\ for live response modules.",
    });
  }
  if (config.mflush) {
    issues.push({
      level: "info",
      message: "--mflush deletes the --mdest folder before the modules run.",
    });
  }
  return issues;
}

function containerIssues(config: KapeConfig): ConfigIssue[] {
  if (config.container === "none") {
    return [];
  }
  if (!hasTargets(config)) {
    return [
      {
        level: "warning",
        message:
          "Containers hold collected targets. Without targets, KAPE does not make one.",
      },
    ];
  }
  const name = config.containerName.trim();
  if (!name) {
    return [
      {
        level: "error",
        message: `--${config.container} needs a base name. Without one, KAPE does not make a container.`,
      },
    ];
  }
  if (FILE_EXTENSION_OR_PATH.test(name)) {
    return [
      {
        level: "warning",
        message: `The container name is a base name, not a file name or path. KAPE adds the timestamp, target name and extension itself.`,
      },
    ];
  }
  return [];
}

function transferIssues(config: KapeConfig): ConfigIssue[] {
  if (config.transfer === "none") {
    return [];
  }
  const issues: ConfigIssue[] = [];
  if (!canTransfer(config)) {
    issues.push({
      level: "error",
      message:
        "KAPE only uploads a container (zip, VHD or VHDX) or zipped module output (--zm). Pick one, or the transfer switches are left out.",
    });
  }
  switch (config.transfer) {
    case "sftp": {
      if (!config.sftpServer.trim()) {
        issues.push({
          level: "error",
          message: "Set the SFTP server (--scs).",
        });
      }
      if (!config.sftpUser.trim()) {
        issues.push({
          level: "error",
          message: "--scu (user name) is required with --scs.",
        });
      }
      if (config.sftpDirectory.trim().startsWith("/")) {
        issues.push({
          level: "error",
          message:
            "--scd must not start with a slash. Use foo/bar, not /foo/bar.",
        });
      }
      break;
    }
    case "s3": {
      if (!(config.s3Bucket.trim() && config.s3Region.trim())) {
        issues.push({
          level: "error",
          message: "Set the S3 bucket (--s3b) and region (--s3r).",
        });
      }
      if (!(config.s3AccessKey.trim() && config.s3Secret.trim())) {
        issues.push({
          level: "warning",
          message:
            "Set the S3 access key (--s3k) and secret (--s3s), or use a pre-signed URL.",
        });
      }
      break;
    }
    case "s3url": {
      if (!config.s3Url.trim()) {
        issues.push({
          level: "error",
          message: "Paste a pre-signed S3 PUT URL (--s3url).",
        });
      }
      break;
    }
    case "azure": {
      if (!config.azureSasUri.trim()) {
        issues.push({
          level: "error",
          message:
            "Paste an Azure container SAS URI with write access (--asu).",
        });
      }
      break;
    }
    default: {
      break;
    }
  }
  return issues;
}

function secretIssues(config: KapeConfig): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  if (config.zipPassword.trim() && !zipsSomething(config)) {
    issues.push({
      level: "warning",
      message:
        "--zpw is ignored: nothing is zipped. Use a zip container, zip the VHD(X) or use --zm.",
    });
  }
  if (hasSecrets(config)) {
    issues.push({
      level: "warning",
      message:
        "Secrets in a command line show in the process list and in shell history. Prefer a short-lived pre-signed URL or SAS. Share links never include secrets.",
    });
  }
  return issues;
}

function diagnosticIssues(config: KapeConfig): ConfigIssue[] {
  return config.trace
    ? [
        {
          level: "info",
          message: "--trace makes very large logs and slows KAPE down.",
        },
      ]
    : [];
}

export function validateKapeConfig(config: KapeConfig): ConfigIssue[] {
  return [
    ...selectionIssues(config),
    ...targetIssues(config),
    ...moduleIssues(config),
    ...containerIssues(config),
    ...transferIssues(config),
    ...secretIssues(config),
    ...diagnosticIssues(config),
  ];
}
