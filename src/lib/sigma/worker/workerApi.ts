import PromiseWorker from "promise-worker";

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

export interface PipelineInfo {
  name: string;
  description: string;
}

type StatusListener = (status: WorkerStatus) => void;

let worker: Worker | null = null;
let promiseWorker: PromiseWorker | null = null;
const statusListeners = new Set<StatusListener>();

function getWorker(): Worker {
  if (worker) {
    return worker;
  }

  if (typeof Worker === "undefined") {
    throw new TypeError("Web Workers are not supported in this environment");
  }

  worker = new Worker(new URL("./webWorker.ts", import.meta.url), {
    type: "module",
  });

  worker.addEventListener("message", (event: MessageEvent) => {
    const data = event.data;
    if (data?.type === "status_update") {
      const status: WorkerStatus = {
        stage: data.stage,
        progress: data.progress,
        ready: data.ready ?? false,
      };
      for (const listener of statusListeners) {
        listener(status);
      }
    }
  });

  promiseWorker = new PromiseWorker(worker);
  return worker;
}

function getPromiseWorker(): PromiseWorker {
  getWorker();
  if (!promiseWorker) {
    throw new Error("Promise worker not initialized");
  }
  return promiseWorker;
}

export function addStatusListener(cb: StatusListener): () => void {
  statusListeners.add(cb);
  // Ensure worker is started
  getWorker();
  return () => {
    statusListeners.delete(cb);
  };
}

export async function convert(params: ConvertParams): Promise<ConvertResult> {
  const pw = getPromiseWorker();
  return pw.postMessage({
    type: "convert",
    payload: params,
  }) as Promise<ConvertResult>;
}

export async function installBackend(packageName: string): Promise<void> {
  const pw = getPromiseWorker();
  await pw.postMessage({
    type: "install",
    payload: { packageName },
  });
}

export async function getAvailablePipelines(
  backend?: string
): Promise<PipelineInfo[]> {
  const pw = getPromiseWorker();
  return pw.postMessage({
    type: "get_pipelines",
    payload: { backend },
  }) as Promise<PipelineInfo[]>;
}

export function destroyWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
    promiseWorker = null;
  }
  statusListeners.clear();
}
