export interface ConversionResult {
  success: boolean;
  query?: string;
  error?: string;
  backend: string;
}

export type RuleCheckSeverity = "error" | "high" | "medium" | "low";

export type RuleCheckDetailValue =
  | string
  | number
  | boolean
  | null
  | RuleCheckDetailValue[];

export interface RuleCheck {
  code: string;
  severity: RuleCheckSeverity;
  message: string;
  details: Record<string, RuleCheckDetailValue>;
  line: number | null;
}

export interface BackendConfig {
  id: string;
  name: string;
  category: "siem" | "edr" | "other";
  package: string;
  backendClass: string;
  language: string;
  waitingForPysigmaRelease?: boolean;
}

export interface ExportPackageOptions {
  rule: string;
  conversions: Map<string, string>;
  metadata: {
    title: string;
    level: string;
    mitre?: string[];
    description?: string;
    author?: string;
  };
}

export interface SigmaRuleEntry {
  id: string;
  title: string;
  description: string;
  level: string;
  status: string;
  logsource: { category?: string; product?: string; service?: string };
  tags: string[];
  author: string;
  date: string;
  filename: string;
}

export interface WorkerStatus {
  stage: string;
  progress: number;
  ready: boolean;
}

export interface ConvertParams {
  ruleYaml: string;
  target: string;
  packageName?: string;
  pipelineNames?: string[];
  pipelineYmls?: string[];
  filterYml?: string;
  outputFormat?: string;
  correlationMethod?: string;
  backendOptions?: Record<string, unknown>;
}

export interface ConvertResult {
  success: boolean;
  query?: string;
  error?: string;
}

export interface ValidateResult {
  success: boolean;
  checks?: RuleCheck[];
  error?: string;
}

export interface PipelineInfo {
  name: string;
  description: string;
}

export type MessageType =
  | "convert"
  | "validate"
  | "install"
  | "get_pipelines";

export interface WorkerMessage {
  type: MessageType;
  payload?: Record<string, unknown>;
}

export interface StatusUpdate {
  type: "status_update";
  stage: string;
  progress: number;
  ready?: boolean;
}
