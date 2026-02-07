import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";

import { RuleStorage } from "../rule-storage";

let testCounter = 0;

describe("ruleStorage (IndexedDB)", () => {
  let storage: RuleStorage;

  beforeEach(() => {
    testCounter++;
    storage = new RuleStorage(`test-db-${testCounter}`);
  });

  it("should save and retrieve a rule", async () => {
    await storage.saveRule({
      id: "test-1",
      name: "Test Rule",
      yaml: "title: Test",
      lastModified: new Date(),
      conversions: [],
    });
    const rule = await storage.loadRule("test-1");
    expect(rule?.name).toBe("Test Rule");
    expect(rule?.yaml).toBe("title: Test");
  });

  it("should list all saved rules", async () => {
    await storage.saveRule({
      id: "1",
      name: "Rule 1",
      yaml: "",
      lastModified: new Date(),
      conversions: [],
    });
    await storage.saveRule({
      id: "2",
      name: "Rule 2",
      yaml: "",
      lastModified: new Date(),
      conversions: [],
    });
    const rules = await storage.listRules();
    expect(rules).toHaveLength(2);
  });

  it("should delete a rule", async () => {
    await storage.saveRule({
      id: "1",
      name: "Rule 1",
      yaml: "",
      lastModified: new Date(),
      conversions: [],
    });
    await storage.deleteRule("1");
    const rule = await storage.loadRule("1");
    expect(rule).toBeNull();
  });

  it("should return null for non-existent rule", async () => {
    const rule = await storage.loadRule("nonexistent");
    expect(rule).toBeNull();
  });

  it("should update an existing rule", async () => {
    await storage.saveRule({
      id: "1",
      name: "Original",
      yaml: "v1",
      lastModified: new Date(),
      conversions: [],
    });
    await storage.saveRule({
      id: "1",
      name: "Updated",
      yaml: "v2",
      lastModified: new Date(),
      conversions: [],
    });
    const rule = await storage.loadRule("1");
    expect(rule?.name).toBe("Updated");
    expect(rule?.yaml).toBe("v2");
  });
});
