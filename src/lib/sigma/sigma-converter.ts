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

  onProgress(callback: ProgressCallback): void {
    this.progressCallbacks.push(callback);
  }

  isReady(): boolean {
    return this.ready;
  }

  async initialize(): Promise<void> {
    if (this.ready) return;

    return new Promise<void>((resolve, reject) => {
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
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
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
    if (this.unsubscribeStatus) {
      this.unsubscribeStatus();
      this.unsubscribeStatus = null;
    }
    destroyWorker();
  }
}
