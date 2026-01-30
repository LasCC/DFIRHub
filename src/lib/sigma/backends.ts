import type { BackendConfig } from "./types";

// Backend IDs must match pySigma autodiscovery keys exactly.
// These are derived from backend class names by stripping "Backend" suffix,
// splitting on CamelCase, joining with "_", and lowercasing.
// Verified against detection.studio (github.com/northsh/detection.studio).

export const backends: BackendConfig[] = [
  // SIEM
  {
    id: "splunk",
    name: "Splunk",
    category: "siem",
    package: "pySigma-backend-splunk",
    backendClass: "SplunkBackend",
    language: "splunk",
  },
  {
    id: "esql",
    name: "Elastic ES|QL",
    category: "siem",
    package: "pySigma-backend-elasticsearch",
    backendClass: "ESQLBackend",
    language: "esql",
  },
  {
    id: "lucene",
    name: "Elastic Lucene",
    category: "siem",
    package: "pySigma-backend-elasticsearch",
    backendClass: "LuceneBackend",
    language: "lucene",
  },
  {
    id: "eql",
    name: "Elastic EQL",
    category: "siem",
    package: "pySigma-backend-elasticsearch",
    backendClass: "EqlBackend",
    language: "eql",
  },
  {
    id: "kusto",
    name: "KQL (Kusto)",
    category: "siem",
    package: "pySigma-backend-kusto",
    backendClass: "KustoBackend",
    language: "kql",
  },
  {
    id: "loki",
    name: "Grafana Loki",
    category: "siem",
    package: "pySigma-backend-loki",
    backendClass: "LogQLBackend",
    language: "logql",
  },
  {
    id: "opensearch_lucene",
    name: "OpenSearch",
    category: "siem",
    package: "pySigma-backend-opensearch",
    backendClass: "OpensearchLuceneBackend",
    language: "lucene",
  },
  {
    id: "datadog",
    name: "Datadog",
    category: "siem",
    package: "pySigma-backend-datadog",
    backendClass: "DatadogBackend",
    language: "datadog",
  },
  {
    id: "secops",
    name: "Google SecOps",
    category: "siem",
    package: "pySigma-backend-secops",
    backendClass: "SecOpsBackend",
    language: "yara-l",
  },
  {
    id: "quickwit",
    name: "Quickwit",
    category: "siem",
    package: "pySigma-backend-quickwit",
    backendClass: "QuickwitBackend",
    language: "quickwit",
  },
  {
    id: "net_witness",
    name: "NetWitness",
    category: "siem",
    package: "pySigma-backend-netwitness",
    backendClass: "NetwitnessBackend",
    language: "netwitness",
  },
  // EDR
  {
    id: "log_scale",
    name: "CrowdStrike LogScale",
    category: "edr",
    package: "pySigma-backend-crowdstrike",
    backendClass: "LogScaleBackend",
    language: "crowdstrike",
  },
  {
    id: "carbon_black",
    name: "Carbon Black",
    category: "edr",
    package: "pySigma-backend-carbonblack",
    backendClass: "CarbonBlackBackend",
    language: "carbonblack",
  },
  {
    id: "sentinel_one_pq",
    name: "SentinelOne",
    category: "edr",
    package: "pySigma-backend-sentinelone-pq",
    backendClass: "SentinelOnePQBackend",
    language: "sentinelone",
  },
  {
    id: "panther",
    name: "Panther",
    category: "edr",
    package: "pySigma-backend-panther",
    backendClass: "PantherBackend",
    language: "python",
  },
  {
    id: "uberagent",
    name: "uberAgent",
    category: "edr",
    package: "pySigma-backend-uberagent",
    backendClass: "uberagent",
    language: "uaql",
  },
  // Other
  {
    id: "sqlite",
    name: "SQLite",
    category: "other",
    package: "pySigma-backend-sqlite",
    backendClass: "sqliteBackend",
    language: "sql",
  },
  {
    id: "surreal_ql",
    name: "SurrealQL",
    category: "other",
    package: "pySigma-backend-surrealql",
    backendClass: "SurrealQLBackend",
    language: "surrealql",
  },
];

export const backendMap = new Map(backends.map((b) => [b.id, b]));

export function getBackend(id: string): BackendConfig | undefined {
  return backendMap.get(id);
}

export function getBackendsByCategory(
  category: BackendConfig["category"]
): BackendConfig[] {
  return backends.filter((b) => b.category === category);
}

export function getFileExtension(backendId: string): string {
  const extensions: Record<string, string> = {
    splunk: "spl",
    esql: "esql",
    lucene: "json",
    eql: "eql",
    kusto: "kql",
    loki: "logql",
    opensearch_lucene: "json",
    datadog: "txt",
    secops: "yaral",
    quickwit: "txt",
    net_witness: "txt",
    log_scale: "txt",
    carbon_black: "txt",
    sentinel_one_pq: "txt",
    panther: "py",
    uberagent: "txt",
    sqlite: "sql",
    surreal_ql: "txt",
  };
  return extensions[backendId] ?? "txt";
}
