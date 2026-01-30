import { beforeEach, describe, expect, test, vi } from "vitest";

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
      setTimeout(() => cb({ stage: "Ready", progress: 1.0, ready: true }), 0);
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

describe("SigmaConverter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initialize", () => {
    test("should initialize and report ready state", async () => {
      const converter = new SigmaConverter();
      expect(converter.isReady()).toBe(false);
      await converter.initialize();
      expect(converter.isReady()).toBe(true);
    });

    test("should not fail on double initialize", async () => {
      const converter = new SigmaConverter();
      await converter.initialize();
      await converter.initialize();
      expect(converter.isReady()).toBe(true);
    });
  });

  describe("convert", () => {
    test("should convert a valid Sigma rule via worker", async () => {
      mockConvert.mockResolvedValue({
        success: true,
        query: 'CommandLine="*powershell -enc*"',
      });

      const converter = new SigmaConverter();
      await converter.initialize();
      const result = await converter.convert(VALID_SIGMA_RULE, "splunk");
      expect(result.success).toBe(true);
      expect(result.query).toContain("powershell -enc");
      expect(result.backend).toBe("splunk");
    });

    test("should pass pipeline params to worker", async () => {
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

    test("should return error for unknown backend", async () => {
      const converter = new SigmaConverter();
      await converter.initialize();
      const result = await converter.convert(VALID_SIGMA_RULE, "nonexistent");
      expect(result.success).toBe(false);
      expect(result.error).toContain("nonexistent");
    });

    test("should return error if not initialized", async () => {
      const converter = new SigmaConverter();
      const result = await converter.convert(VALID_SIGMA_RULE, "splunk");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not initialized");
    });

    test("should handle worker errors gracefully", async () => {
      mockConvert.mockRejectedValue(new Error("Worker crashed"));

      const converter = new SigmaConverter();
      await converter.initialize();
      const result = await converter.convert(VALID_SIGMA_RULE, "splunk");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Worker crashed");
    });
  });

  describe("convertMulti", () => {
    test("should convert to multiple backends", async () => {
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
      expect(results.get("splunk")?.success).toBe(true);
      expect(results.get("kusto")?.success).toBe(true);
    });
  });

  describe("destroy", () => {
    test("should reset ready state after destroy", async () => {
      const converter = new SigmaConverter();
      await converter.initialize();
      expect(converter.isReady()).toBe(true);
      converter.destroy();
      expect(converter.isReady()).toBe(false);
      expect(mockDestroyWorker).toHaveBeenCalled();
    });
  });

  describe("onProgress", () => {
    test("should call progress callback during initialization", async () => {
      const progressFn = vi.fn();
      const converter = new SigmaConverter();
      converter.onProgress(progressFn);
      await converter.initialize();
      expect(progressFn).toHaveBeenCalledWith(1.0);
    });
  });

  describe("getAvailablePipelines", () => {
    test("should delegate to worker API", async () => {
      const pipelines = [{ name: "windows", description: "Windows" }];
      mockGetPipelines.mockResolvedValue(pipelines);

      const converter = new SigmaConverter();
      await converter.initialize();
      const result = await converter.getAvailablePipelines();
      expect(result).toEqual(pipelines);
    });
  });
});
