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
}

export interface SavedRule {
  id: string;
  name: string;
  yaml: string;
  lastModified: Date;
  conversions: ConversionResult[];
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
