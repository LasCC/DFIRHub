import { describe, expect, it } from "vitest";

import { loadAllTargets } from "../../kapefiles";
import { loadAllModules } from "../../kapeModules";
import { isLockedOnLiveSystem } from "../../lockedFiles";
import { SCENARIO_PRESETS } from "../presets";

const targetNames = new Set(
  loadAllTargets().map((target) =>
    target.sourceFile.replace(/\.tkape$/, "").toLowerCase()
  )
);
const moduleNames = new Set(
  loadAllModules().map((module) => module.name.toLowerCase())
);

describe("scenario presets", () => {
  it.each(SCENARIO_PRESETS)(
    "$id only uses targets that exist in KapeFiles",
    (preset) => {
      const missing = preset.targets.filter(
        (name) => !targetNames.has(name.toLowerCase())
      );
      expect(missing).toEqual([]);
    }
  );

  it.each(SCENARIO_PRESETS)(
    "$id only uses modules that exist in KapeFiles",
    (preset) => {
      const missing = preset.modules.filter(
        (name) => !moduleNames.has(name.toLowerCase())
      );
      expect(missing).toEqual([]);
    }
  );
});

describe("locked file detection", () => {
  it("flags files Windows keeps open on a live system", () => {
    const locked = [
      { category: "", name: "$MFT", path: "C:\\", fileMask: "$MFT" },
      {
        category: "",
        name: "$J",
        path: "C:\\$Extend\\$UsnJrnl",
        fileMask: "$J",
      },
      {
        category: "",
        name: "SYSTEM",
        path: "C:\\Windows\\System32\\config\\",
        fileMask: "SYSTEM",
      },
      {
        category: "",
        name: "SAM logs",
        path: "C:\\Windows\\System32\\config\\",
        fileMask: "SAM.LOG*",
      },
      {
        category: "",
        name: "NTUSER",
        path: "C:\\Users\\%user%\\",
        fileMask: "NTUSER.DAT",
      },
      {
        category: "",
        name: "Event logs",
        path: "C:\\Windows\\System32\\winevt\\Logs\\",
        fileMask: "*.evtx",
      },
      { category: "", name: "SRUM", path: "C:\\Windows\\System32\\SRU\\" },
    ];
    expect(locked.filter((entry) => !isLockedOnLiveSystem(entry))).toEqual([]);
  });

  it("does not flag copies that are not in use", () => {
    const free = [
      {
        category: "",
        name: "RegBack",
        path: "C:\\Windows\\System32\\config\\RegBack\\",
        fileMask: "SYSTEM",
      },
      {
        category: "",
        name: "Old SYSTEM",
        path: "C:\\Windows.old\\Windows\\System32\\config\\",
        fileMask: "SYSTEM",
      },
      {
        category: "",
        name: "Prefetch",
        path: "C:\\Windows\\prefetch\\",
        fileMask: "*.pf",
      },
      {
        category: "",
        name: "Recycle Bin",
        path: "C:\\$Recycle.Bin\\",
        fileMask: "$I*",
      },
    ];
    expect(free.filter(isLockedOnLiveSystem)).toEqual([]);
  });
});
