export const PYODIDE_VERSION = "314.0.7";
export const PYODIDE_CDN_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

export const SIGMA_PACKAGES_PATH = "/sigma-packages/";
export const SIGMA_LOCK_FILE = "pyodide-lock.json";

export const CORE_PACKAGES = [
  "pyyaml",
  "pysigma",
  "pysigma-pipeline-windows",
  "pysigma-pipeline-sysmon",
];
export const VALIDATOR_PACKAGE = "pysigma-validators-sigmahq";

const PACKAGE_NAME_SEPARATORS = /[-_.]+/gu;

export function toLockPackageName(packageName: string): string {
  return packageName.toLowerCase().replaceAll(PACKAGE_NAME_SEPARATORS, "-");
}
