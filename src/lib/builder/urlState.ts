import {
  CONTAINER_TYPES,
  DEFAULT_CONFIG,
  OUTPUT_FORMATS,
  TRANSFER_TYPES,
} from "./config";
import type { KapeConfig, SecretField } from "./config";

type StringField = Exclude<
  {
    [Key in keyof KapeConfig]: string extends KapeConfig[Key] ? Key : never;
  }[keyof KapeConfig],
  SecretField
>;

type BooleanField = {
  [Key in keyof KapeConfig]: KapeConfig[Key] extends boolean ? Key : never;
}[keyof KapeConfig];

const STRING_PARAMS: Record<string, StringField> = {
  case: "caseId",
  cmt: "transferComment",
  cn: "containerName",
  dst: "tdest",
  ex: "examiner",
  mdst: "mdest",
  mef: "exportFormat",
  msrc: "msource",
  s3b: "s3Bucket",
  s3kp: "s3KeyPrefix",
  s3p: "s3Provider",
  s3r: "s3Region",
  scd: "sftpDirectory",
  scp: "sftpPort",
  scs: "sftpServer",
  scu: "sftpUser",
  src: "tsource",
};

const BOOLEAN_PARAMS: Record<string, BooleanField> = {
  cu: "cleanup",
  debug: "debug",
  gui: "gui",
  mflush: "mflush",
  rlc: "keepLocalCopy",
  tdd: "deduplicate",
  tflush: "tflush",
  trace: "trace",
  ul: "linear",
  vss: "vss",
  zm: "zipModules",
  zv: "zipContainer",
};

const TARGETS_PARAM = "t";
const MODULES_PARAM = "m";
const LIST_SEPARATOR = ",";

function pickAllowed<T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T
): T {
  return allowed.find((candidate) => candidate === value) ?? fallback;
}

function parseList(value: string | null): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(LIST_SEPARATOR)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function configToSearchParams(config: KapeConfig): URLSearchParams {
  const params = new URLSearchParams();
  if (config.targets.length > 0) {
    params.set(TARGETS_PARAM, config.targets.join(LIST_SEPARATOR));
  }
  if (config.modules.length > 0) {
    params.set(MODULES_PARAM, config.modules.join(LIST_SEPARATOR));
  }
  for (const [param, field] of Object.entries(STRING_PARAMS)) {
    if (config[field] !== DEFAULT_CONFIG[field]) {
      params.set(param, config[field]);
    }
  }
  for (const [param, field] of Object.entries(BOOLEAN_PARAMS)) {
    if (config[field] !== DEFAULT_CONFIG[field]) {
      params.set(param, config[field] ? "1" : "0");
    }
  }
  if (config.container !== DEFAULT_CONFIG.container) {
    params.set("c", config.container);
  }
  if (config.transfer !== DEFAULT_CONFIG.transfer) {
    params.set("tx", config.transfer);
  }
  if (config.format !== DEFAULT_CONFIG.format) {
    params.set("f", config.format);
  }
  return params;
}

export function configFromSearchParams(params: URLSearchParams): KapeConfig {
  const config: KapeConfig = {
    ...DEFAULT_CONFIG,
    modules: parseList(params.get(MODULES_PARAM)),
    targets: parseList(params.get(TARGETS_PARAM)),
  };
  for (const [param, field] of Object.entries(STRING_PARAMS)) {
    const value = params.get(param);
    if (value !== null) {
      config[field] = value;
    }
  }
  for (const [param, field] of Object.entries(BOOLEAN_PARAMS)) {
    const value = params.get(param);
    if (value !== null) {
      config[field] = value === "1";
    }
  }
  config.container = pickAllowed(
    params.get("c"),
    CONTAINER_TYPES,
    DEFAULT_CONFIG.container
  );
  config.transfer = pickAllowed(
    params.get("tx"),
    TRANSFER_TYPES,
    DEFAULT_CONFIG.transfer
  );
  config.format = pickAllowed(
    params.get("f"),
    OUTPUT_FORMATS,
    DEFAULT_CONFIG.format
  );
  return config;
}

export function builderHref(selection: {
  targets: string[];
  modules: string[];
}): string {
  const query = configToSearchParams({
    ...DEFAULT_CONFIG,
    ...selection,
  }).toString();
  return query ? `/builder?${query}` : "/builder";
}
