import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the worker API module
const mockConvert = vi.fn();
const mockGetPipelines = vi.fn();
const mockDestroyWorker = vi.fn();

vi.mock("../worker/workerApi", () => ({
  addStatusListener: vi.fn(
    (
      cb: (status: { stage: string; progress: number; ready: boolean }) => void
    ) => {
      // Simulate immediate ready
      setTimeout(() => cb({ stage: "Ready", progress: 1, ready: true }), 0);
      return () => {
        // unsubscribe no-op
      };
    }
  ),
  convert: (...args: unknown[]) => mockConvert(...args),
  destroyWorker: () => mockDestroyWorker(),
  getAvailablePipelines: (...args: unknown[]) => mockGetPipelines(...args),
}));

import { SigmaConverter } from "../sigma-converter";

const VALID_SIGMA_RULE = `
title: Suspicious Process Creation
status: test
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        CommandLine|contains:
            - 'powershell -enc'
            - 'cmd /c whoami'
    condition: selection
level: medium
`;

describe("sigmaConverter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initialize", () => {
    it("should initialize and report ready state", async () => {
      const converter = new SigmaConverter();
      expect(converter.isReady()).toBeFalsy();
      await converter.initialize();
      expect(converter.isReady()).toBeTruthy();
    });

    it("should not fail on double initialize", async () => {
      const converter = new SigmaConverter();
      await converter.initialize();
      await converter.initialize();
      expect(converter.isReady()).toBeTruthy();
    });

    it("should reject with timeout if worker never responds", async () => {
      vi.useFakeTimers();

      // Override the mock to never call the callback (worker hangs)
      const workerApi = await import("../worker/workerApi");
      const addStatusSpy = vi.spyOn(workerApi, "addStatusListener");
      addStatusSpy.mockImplementationOnce(() => () => {
        // unsubscribe no-op
      });

      const converter = new SigmaConverter();
      const initPromise = converter.initialize();

      // Fast-forward past the 60s timeout
      vi.advanceTimersByTime(61_000);

      await expect(initPromise).rejects.toThrow("Initialization timed out");
      converter.destroy();
      addStatusSpy.mockRestore();

      vi.useRealTimers();
    });
  });

  describe("convert", () => {
    it("should convert a valid Sigma rule via worker", async () => {
      mockConvert.mockResolvedValue({
        success: true,
        query: 'CommandLine="*powershell -enc*"',
      });

      const converter = new SigmaConverter();
      await converter.initialize();
      const result = await converter.convert(VALID_SIGMA_RULE, "splunk");
      expect(result.success).toBeTruthy();
      expect(result.query).toContain("powershell -enc");
      expect(result.backend).toBe("splunk");
    });

    it("should pass pipeline params to worker", async () => {
      mockConvert.mockResolvedValue({ success: true, query: "test output" });

      const converter = new SigmaConverter();
      await converter.initialize();
      await converter.convert(
        VALID_SIGMA_RULE,
        "splunk",
        ["windows_sysmon"],
        ["custom: yaml"]
      );

      expect(mockConvert).toHaveBeenCalledWith(
        expect.objectContaining({
          pipelineNames: ["windows_sysmon"],
          pipelineYmls: ["custom: yaml"],
        })
      );
    });

    it("should return error for unknown backend", async () => {
      const converter = new SigmaConverter();
      await converter.initialize();
      const result = await converter.convert(VALID_SIGMA_RULE, "nonexistent");
      expect(result.success).toBeFalsy();
      expect(result.error).toContain("nonexistent");
    });

    it("should return error if not initialized", async () => {
      const converter = new SigmaConverter();
      const result = await converter.convert(VALID_SIGMA_RULE, "splunk");
      expect(result.success).toBeFalsy();
      expect(result.error).toContain("not initialized");
    });

    it("should handle worker errors gracefully", async () => {
      mockConvert.mockRejectedValue(new Error("Worker crashed"));

      const converter = new SigmaConverter();
      await converter.initialize();
      const result = await converter.convert(VALID_SIGMA_RULE, "splunk");
      expect(result.success).toBeFalsy();
      expect(result.error).toContain("Worker crashed");
    });
  });

  describe("convertMulti", () => {
    it("should convert to multiple backends", async () => {
      mockConvert
        .mockResolvedValueOnce({ success: true, query: "splunk query" })
        .mockResolvedValueOnce({ success: true, query: "kusto query" });

      const converter = new SigmaConverter();
      await converter.initialize();
      const results = await converter.convertMulti(VALID_SIGMA_RULE, [
        "splunk",
        "kusto",
      ]);
      expect(results.size).toBe(2);
      expect(results.get("splunk")?.success).toBeTruthy();
      expect(results.get("kusto")?.success).toBeTruthy();
    });
  });

  describe("destroy", () => {
    it("should reset ready state after destroy", async () => {
      const converter = new SigmaConverter();
      await converter.initialize();
      expect(converter.isReady()).toBeTruthy();
      converter.destroy();
      expect(converter.isReady()).toBeFalsy();
      expect(mockDestroyWorker).toHaveBeenCalledWith();
    });
  });

  describe("onProgress", () => {
    it("should call progress callback during initialization", async () => {
      const progressFn = vi.fn();
      const converter = new SigmaConverter();
      converter.onProgress(progressFn);
      await converter.initialize();
      expect(progressFn).toHaveBeenCalledWith(1);
    });
  });

  describe("getAvailablePipelines", () => {
    it("should delegate to worker API", async () => {
      const pipelines = [{ name: "windows", description: "Windows" }];
      mockGetPipelines.mockResolvedValue(pipelines);

      const converter = new SigmaConverter();
      await converter.initialize();
      const result = await converter.getAvailablePipelines();
      expect(result).toStrictEqual(pipelines);
    });
  });
});
