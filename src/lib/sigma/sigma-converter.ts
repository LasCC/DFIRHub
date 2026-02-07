import type { ConversionResult } from "./types";
import type {
  ConvertParams,
  PipelineInfo,
  WorkerStatus,
} from "./worker/workerApi";

import { getBackend } from "./backends";
import {
  addStatusListener,
  destroyWorker,
  convert as workerConvert,
  getAvailablePipelines as workerGetPipelines,
} from "./worker/workerApi";

type ProgressCallback = (progress: number) => void;

export class SigmaConverter {
  private ready = false;
  private progressCallbacks: ProgressCallback[] = [];
  private unsubscribeStatus: (() => void) | null = null;
  private initTimeout: number | undefined;

  onProgress(callback: ProgressCallback): void {
    this.progressCallbacks.push(callback);
  }

  isReady(): boolean {
    return this.ready;
  }

  async initialize(): Promise<void> {
    if (this.ready) {
      return;
    }

    const INIT_TIMEOUT_MS = 60_000;

    const initPromise = new Promise<void>((resolve, reject) => {
      this.unsubscribeStatus = addStatusListener((status: WorkerStatus) => {
        for (const cb of this.progressCallbacks) {
          cb(status.progress);
        }

        if (status.ready) {
          this.ready = true;
          resolve();
        }

        if (status.stage.startsWith("Error:")) {
          reject(new Error(status.stage));
        }
      });
    });

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      this.initTimeout = globalThis.setTimeout(() => {
        reject(
          new Error(
            "Initialization timed out after 60 seconds. Check your network connection and try again."
          )
        );
      }, INIT_TIMEOUT_MS) as unknown as number;
    });

    try {
      await Promise.race([initPromise, timeoutPromise]);
    } finally {
      clearTimeout(this.initTimeout);
      this.initTimeout = undefined;
    }
  }

  async convert(
    rule: string,
    backend: string,
    pipelineNames?: string[],
    pipelineYmls?: string[],
    options?: {
      filterYml?: string;
      correlationMethod?: string;
      backendOptions?: Record<string, unknown>;
    }
  ): Promise<ConversionResult> {
    if (!this.ready) {
      return { success: false, error: "Converter not initialized", backend };
    }

    const config = getBackend(backend);
    if (!config) {
      return {
        success: false,
        error: `Unknown backend: ${backend}`,
        backend,
      };
    }

    try {
      const params: ConvertParams = {
        ruleYaml: rule,
        target: config.id,
        packageName: config.package,
        pipelineNames,
        pipelineYmls,
        filterYml: options?.filterYml,
        correlationMethod: options?.correlationMethod,
        backendOptions: options?.backendOptions,
      };

      const result = await workerConvert(params);

      return {
        success: result.success,
        query: result.query,
        error: result.error,
        backend,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        backend,
      };
    }
  }

  async convertMulti(
    rule: string,
    backendIds: string[],
    pipelineNames?: string[],
    pipelineYmls?: string[],
    options?: {
      filterYml?: string;
      correlationMethod?: string;
      backendOptions?: Record<string, unknown>;
    }
  ): Promise<Map<string, ConversionResult>> {
    const results = new Map<string, ConversionResult>();
    for (const id of backendIds) {
      results.set(
        id,
        await this.convert(rule, id, pipelineNames, pipelineYmls, options)
      );
    }
    return results;
  }

  async getAvailablePipelines(backend?: string): Promise<PipelineInfo[]> {
    return workerGetPipelines(backend);
  }

  destroy(): void {
    this.ready = false;
    this.progressCallbacks = [];
    clearTimeout(this.initTimeout);
    this.initTimeout = undefined;
    if (this.unsubscribeStatus) {
      this.unsubscribeStatus();
      this.unsubscribeStatus = null;
    }
    destroyWorker();
  }
}
