import registerPromiseWorker from "promise-worker/register";

import sigmaConverterPy from "../python/sigma_converter.py?raw";
import {
  CORE_PACKAGES,
  PYODIDE_CDN_BASE,
  SIGMA_LOCK_FILE,
  SIGMA_PACKAGES_PATH,
  VALIDATOR_PACKAGE,
  toLockPackageName,
} from "./pyodide-packages";

const SIGMA_LOCK_URL = `${self.location.origin}${SIGMA_PACKAGES_PATH}${SIGMA_LOCK_FILE}`;

interface PyodideInterface {
  loadPackage: (
    pkg: string | string[],
    options?: { messageCallback?: (message: string) => void }
  ) => Promise<void>;
  lockfile: { packages: Record<string, unknown> };
  runPythonAsync: (code: string) => Promise<unknown>;
  globals: {
    get: (name: string) => unknown;
    set: (name: string, value: unknown) => void;
  };
  pyimport: (name: string) => unknown;
}

type MessageType =
  | "convert"
  | "validate"
  | "install"
  | "get_pipelines"
  | "status";

interface WorkerMessage {
  type: MessageType;
  payload?: Record<string, unknown>;
}

interface StatusUpdate {
  type: "status_update";
  stage: string;
  progress: number;
  ready?: boolean;
}

let pyodide: PyodideInterface | null = null;
const installedBackends = new Set<string>();
let sigmahqValidatorsPromise: Promise<void> | null = null;

const SIGMAHQ_VALIDATOR_DATA_MODULES = {
  data_taxonomy: "sigmahq_taxonomy.json",
  data_windows_eventid: "sigmahq_windows_eventid.json",
  data_windows_provider: "sigmahq_windows_provider.json",
} as const;

const ignoreMessage = () => null;

function sendStatus(stage: string, progress: number, ready = false) {
  self.postMessage({
    type: "status_update",
    stage,
    progress,
    ready,
  } satisfies StatusUpdate);
}

async function initPyodide(): Promise<void> {
  if (pyodide) {
    return;
  }

  sendStatus("Loading Pyodide runtime", 0.1);

  const { loadPyodide } = await import(
    /* @vite-ignore */ `${PYODIDE_CDN_BASE}pyodide.mjs`
  );
  sendStatus("Loading pySigma", 0.4);
  pyodide = (await loadPyodide({
    indexURL: PYODIDE_CDN_BASE,
    lockFileURL: SIGMA_LOCK_URL,
    packages: CORE_PACKAGES,
  })) as PyodideInterface;

  sendStatus("Loading converter module", 0.8);
  await pyodide.runPythonAsync(sigmaConverterPy);

  sendStatus("Ready", 1, true);
}

async function fetchSigmahqValidatorData(): Promise<Record<string, string>> {
  const entries = await Promise.all(
    Object.entries(SIGMAHQ_VALIDATOR_DATA_MODULES).map(
      async ([moduleName, filename]) => {
        const response = await fetch(
          `${self.location.origin}/sigma-rules/validators/${filename}`
        );
        if (!response.ok) {
          throw new Error(`Failed to load ${filename}: ${response.status}`);
        }
        return [moduleName, await response.text()] as const;
      }
    )
  );
  return Object.fromEntries(entries);
}

const LOAD_SIGMAHQ_DATA_PYTHON = `
import json as _json
load_sigmahq_validator_data(_json.loads(_validator_data_json))
refresh_plugins()
`;

async function installSigmahqValidators(): Promise<void> {
  if (!pyodide) {
    return;
  }
  const [validatorData] = await Promise.all([
    fetchSigmahqValidatorData(),
    pyodide.loadPackage(VALIDATOR_PACKAGE, { messageCallback: ignoreMessage }),
  ]);
  pyodide.globals.set("_validator_data_json", JSON.stringify(validatorData));
  await pyodide.runPythonAsync(LOAD_SIGMAHQ_DATA_PYTHON);
}

function continueWithCoreValidatorsOnly(): void {
  sigmahqValidatorsPromise = Promise.resolve();
}

function ensureSigmahqValidators(): Promise<void> {
  sigmahqValidatorsPromise ??= installSigmahqValidators().catch(
    continueWithCoreValidatorsOnly
  );
  return sigmahqValidatorsPromise;
}

async function installBackendPackage(packageName: string): Promise<void> {
  if (!pyodide || installedBackends.has(packageName)) {
    return;
  }

  const lockPackageName = toLockPackageName(packageName);
  if (!(lockPackageName in pyodide.lockfile.packages)) {
    throw new Error(
      `${packageName} does not work with pySigma 1.3.3 in the browser`
    );
  }
  await pyodide.loadPackage(lockPackageName, {
    messageCallback: ignoreMessage,
  });
  installedBackends.add(packageName);
  await pyodide.runPythonAsync("refresh_plugins()");
}

const CONVERT_PYTHON = `
import json as _json
_params = _json.loads(_params_json)
try:
    _output = convert_rule(
        rule_yaml=_params["ruleYaml"],
        target=_params["target"],
        pipeline_names=_params.get("pipelineNames") or [],
        pipeline_ymls=_params.get("pipelineYmls") or [],
        filter_yml=_params.get("filterYml"),
        output_format=_params.get("outputFormat", "default"),
        correlation_method=_params.get("correlationMethod"),
        backend_options=_params.get("backendOptions") or {},
    )
    if isinstance(_output, bytes):
        _output = _output.decode("utf-8")
    elif isinstance(_output, (list, dict)):
        _output = _json.dumps(_output, indent=2)
    else:
        _output = str(_output)
    _conv_result = _json.dumps({"success": True, "query": _output})
except Exception as _e:
    _conv_result = _json.dumps({"success": False, "error": str(_e)})
_conv_result
`;

async function convert(
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (!pyodide) {
    throw new Error("Pyodide not initialized");
  }

  const packageName = payload.packageName;
  if (packageName && typeof packageName === "string") {
    try {
      await installBackendPackage(packageName);
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  pyodide.globals.set("_params_json", JSON.stringify(payload));
  const resultJson = (await pyodide.runPythonAsync(CONVERT_PYTHON)) as string;
  return JSON.parse(resultJson) as Record<string, unknown>;
}

const VALIDATE_PYTHON = `
import json as _json
try:
    _val_result = _json.dumps({"success": True, "checks": validate_rule(_validate_yaml)})
except Exception as _e:
    _val_result = _json.dumps({"success": False, "error": str(_e)})
_val_result
`;

async function validate(
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (!pyodide) {
    throw new Error("Pyodide not initialized");
  }

  await ensureSigmahqValidators();
  pyodide.globals.set(
    "_validate_yaml",
    typeof payload.ruleYaml === "string" ? payload.ruleYaml : ""
  );
  const resultJson = (await pyodide.runPythonAsync(VALIDATE_PYTHON)) as string;
  return JSON.parse(resultJson) as Record<string, unknown>;
}

const GET_PIPELINES_PYTHON = `
import json as _json
_json.dumps(get_available_pipelines(_pipeline_backend or ""))
`;

async function getPipelines(
  payload: Record<string, unknown>
): Promise<unknown> {
  if (!pyodide) {
    throw new Error("Pyodide not initialized");
  }

  pyodide.globals.set(
    "_pipeline_backend",
    typeof payload.backend === "string" ? payload.backend : ""
  );
  const resultJson = (await pyodide.runPythonAsync(
    GET_PIPELINES_PYTHON
  )) as string;
  return JSON.parse(resultJson);
}

const initPromise = initPyodide().catch((error: Error) => {
  sendStatus(`Error: ${error.message}`, 0);
  throw error;
});

registerPromiseWorker(async (msg: WorkerMessage) => {
  await initPromise;

  switch (msg.type) {
    case "convert": {
      return convert(msg.payload ?? {});
    }
    case "validate": {
      return validate(msg.payload ?? {});
    }
    case "install": {
      const pkg = msg.payload?.packageName;
      if (typeof pkg === "string") {
        await installBackendPackage(pkg);
      }
      return { success: true };
    }
    case "get_pipelines": {
      return getPipelines(msg.payload ?? {});
    }
    case "status": {
      return { ready: pyodide !== null };
    }
    default: {
      throw new Error(`Unknown message type: ${msg.type}`);
    }
  }
});
