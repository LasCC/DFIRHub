import registerPromiseWorker from "promise-worker/register";
import sigmaConverterPy from "../python/sigma_converter.py?raw";

interface PyodideInterface {
  loadPackage: (pkg: string | string[]) => Promise<void>;
  runPythonAsync: (code: string) => Promise<unknown>;
  globals: {
    get: (name: string) => unknown;
    set: (name: string, value: unknown) => void;
  };
  pyimport: (name: string) => unknown;
}

type MessageType = "convert" | "install" | "get_pipelines" | "status";

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

function sendStatus(stage: string, progress: number, ready = false) {
  self.postMessage({
    type: "status_update",
    stage,
    progress,
    ready,
  } satisfies StatusUpdate);
}

async function initPyodide(): Promise<void> {
  if (pyodide) return;

  sendStatus("Loading Pyodide runtime", 0.1);

  const { loadPyodide } = await import(
    // @ts-expect-error -- Pyodide loaded from CDN at runtime
    /* @vite-ignore */ "https://cdn.jsdelivr.net/pyodide/v0.29.0/full/pyodide.mjs"
  );
  pyodide = (await loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.0/full/",
  })) as PyodideInterface;

  sendStatus("Installing micropip", 0.25);
  await pyodide.loadPackage("micropip");

  sendStatus("Installing PyYAML", 0.35);
  const micropip = pyodide.pyimport("micropip") as {
    install: (
      pkg: string | string[],
      opts?: Record<string, unknown>
    ) => Promise<void>;
  };

  const wheelUrl = `${self.location.origin}/wheels/pyyaml-6.0.3-cp313-cp313-pyodide_2025_0_wasm32.whl`;
  await micropip.install(wheelUrl);

  sendStatus("Installing pySigma", 0.5);
  await micropip.install("pySigma");

  sendStatus("Installing default pipelines", 0.65);
  await micropip.install([
    "pySigma-pipeline-windows",
    "pySigma-pipeline-sysmon",
  ]);

  sendStatus("Loading converter module", 0.8);
  await pyodide.runPythonAsync(sigmaConverterPy);

  sendStatus("Ready", 1.0, true);
}

async function installBackendPackage(packageName: string): Promise<void> {
  if (!pyodide || installedBackends.has(packageName)) return;

  const micropip = pyodide.pyimport("micropip") as {
    install: (pkg: string) => Promise<void>;
  };
  await micropip.install(packageName);
  installedBackends.add(packageName);

  // Reload converter module to pick up new backends via autodiscovery
  await pyodide.runPythonAsync(sigmaConverterPy);
}

function buildConvertCall(payload: Record<string, unknown>): string {
  const ruleYaml = JSON.stringify(payload.ruleYaml ?? "");
  const target = JSON.stringify(payload.target ?? "");
  const pipelineNames = JSON.stringify(payload.pipelineNames ?? []);
  const pipelineYmls = JSON.stringify(payload.pipelineYmls ?? []);
  const filterYml = payload.filterYml
    ? JSON.stringify(payload.filterYml)
    : "None";
  const outputFormat = JSON.stringify(payload.outputFormat ?? "default");
  const correlationMethod = payload.correlationMethod
    ? JSON.stringify(payload.correlationMethod)
    : "None";
  const backendOpts = JSON.stringify(
    JSON.stringify(payload.backendOptions ?? {})
  );

  return `
import json as _json
try:
    _output = convert_rule(
        rule_yaml=${ruleYaml},
        target=${target},
        pipeline_names=${pipelineNames},
        pipeline_ymls=${pipelineYmls},
        filter_yml=${filterYml},
        output_format=${outputFormat},
        correlation_method=${correlationMethod},
        backend_options=_json.loads(${backendOpts}),
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
}

async function convert(
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (!pyodide) throw new Error("Pyodide not initialized");

  const packageName = payload.packageName;
  if (packageName && typeof packageName === "string") {
    await installBackendPackage(packageName);
  }

  const pyCode = buildConvertCall(payload);
  const resultJson = (await pyodide.runPythonAsync(pyCode)) as string;
  return JSON.parse(resultJson) as Record<string, unknown>;
}

async function getPipelines(
  payload: Record<string, unknown>
): Promise<unknown> {
  if (!pyodide) throw new Error("Pyodide not initialized");

  const backend = payload.backend ? JSON.stringify(payload.backend) : "None";
  const resultJson = (await pyodide.runPythonAsync(`
import json
json.dumps(get_available_pipelines(${backend}))
`)) as string;
  return JSON.parse(resultJson);
}

const initPromise = initPyodide().catch((err: Error) => {
  sendStatus(`Error: ${err.message}`, 0);
  throw err;
});

registerPromiseWorker(async (msg: WorkerMessage) => {
  await initPromise;

  switch (msg.type) {
    case "convert":
      return convert(msg.payload ?? {});
    case "install": {
      const pkg = msg.payload?.packageName;
      if (typeof pkg === "string") {
        await installBackendPackage(pkg);
      }
      return { success: true };
    }
    case "get_pipelines":
      return getPipelines(msg.payload ?? {});
    case "status":
      return { ready: pyodide !== null };
    default:
      throw new Error(`Unknown message type: ${msg.type}`);
  }
});
