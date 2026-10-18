import type { KapeTargetEntry } from "../kapefiles";

export interface BuilderTarget {
  slug: string;
  name: string;
  kapeName: string;
  description: string;
  category: string;
  isCompound: boolean;
  entries: KapeTargetEntry[];
  childSlugs: string[];
}

export interface BuilderModule {
  name: string;
  description: string;
  category: string;
  folder: string;
  exportFormats: string[];
  isCompound: boolean;
  referencedModules: string[];
}

export type ContainerType = "none" | "vhdx" | "vhd" | "zip";
export type TransferType = "none" | "sftp" | "s3" | "s3url" | "azure";
export type OutputFormat = "kape" | "cli" | "powershell" | "batch" | "wsl";

export interface KapeConfig {
  targets: string[];
  modules: string[];
  tsource: string;
  tdest: string;
  vss: boolean;
  tflush: boolean;
  deduplicate: boolean;
  msource: string;
  mdest: string;
  mflush: boolean;
  exportFormat: string;
  zipModules: boolean;
  container: ContainerType;
  containerName: string;
  zipContainer: boolean;
  zipPassword: string;
  transfer: TransferType;
  sftpServer: string;
  sftpPort: string;
  sftpUser: string;
  sftpPassword: string;
  sftpDirectory: string;
  s3Provider: string;
  s3Region: string;
  s3Bucket: string;
  s3AccessKey: string;
  s3Secret: string;
  s3SessionToken: string;
  s3KeyPrefix: string;
  s3Url: string;
  azureSasUri: string;
  transferComment: string;
  keepLocalCopy: boolean;
  debug: boolean;
  trace: boolean;
  gui: boolean;
  cleanup: boolean;
  linear: boolean;
  caseId: string;
  examiner: string;
  format: OutputFormat;
}

export const DEFAULT_CONFIG: KapeConfig = {
  azureSasUri: "",
  caseId: "",
  cleanup: false,
  container: "none",
  containerName: "evidence",
  debug: false,
  deduplicate: true,
  examiner: "",
  exportFormat: "",
  format: "kape",
  gui: false,
  keepLocalCopy: false,
  linear: false,
  mdest: "D:\\KAPE\\%m\\Modules",
  mflush: false,
  modules: [],
  msource: "",
  s3AccessKey: "",
  s3Bucket: "",
  s3KeyPrefix: "",
  s3Provider: "spAmazonS3",
  s3Region: "",
  s3Secret: "",
  s3SessionToken: "",
  s3Url: "",
  sftpDirectory: "",
  sftpPassword: "",
  sftpPort: "22",
  sftpServer: "",
  sftpUser: "",
  targets: [],
  tdest: "D:\\KAPE\\%m\\Targets",
  tflush: false,
  trace: false,
  transfer: "none",
  transferComment: "",
  tsource: "C:",
  vss: false,
  zipContainer: true,
  zipModules: false,
  zipPassword: "",
};

export const SECRET_FIELDS = [
  "zipPassword",
  "sftpPassword",
  "s3AccessKey",
  "s3Secret",
  "s3SessionToken",
  "s3Url",
  "azureSasUri",
] as const satisfies readonly (keyof KapeConfig)[];

export function hasSecrets(config: KapeConfig): boolean {
  return SECRET_FIELDS.some((field) => config[field].trim() !== "");
}
