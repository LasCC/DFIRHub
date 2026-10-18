import fs from "node:fs";
import path from "node:path";

import * as yaml from "js-yaml";

export interface KapeModule {
  name: string;
  description: string;
  category: string;
  folder: string;
  author: string;
  binaryUrl?: string;
  exportFormats: string[];
  isCompound: boolean;
  referencedModules: string[];
}

interface RawKapeProcessor {
  Executable?: string;
  ExportFormat?: string;
}

interface RawKapeModule {
  Description?: string;
  Category?: string;
  Author?: string;
  BinaryUrl?: string;
  ExportFormat?: string;
  Processors?: RawKapeProcessor[];
}

const MODULES_DIRECTORY = "src/content/kapefiles/Modules";
const DISABLED_FOLDER = "!Disabled";
const MODULE_EXTENSION = ".mkape";

let moduleCache: KapeModule[] | null = null;

function listModuleFiles(directory: string): string[] {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((dirent) => {
      const fullPath = path.join(directory, dirent.name);
      if (dirent.isDirectory()) {
        return dirent.name === DISABLED_FOLDER ? [] : listModuleFiles(fullPath);
      }
      return dirent.name.endsWith(MODULE_EXTENSION) ? [fullPath] : [];
    });
}

function moduleNameFromFile(fileName: string): string {
  return path.basename(fileName.replaceAll("\\", "/"), MODULE_EXTENSION);
}

function uniqueLowercaseFormats(raw: RawKapeModule): string[] {
  const formats = [
    raw.ExportFormat,
    ...(raw.Processors ?? []).map((processor) => processor.ExportFormat),
  ]
    .filter((format): format is string => Boolean(format?.trim()))
    .map((format) => format.trim().toLowerCase());
  return [...new Set(formats)];
}

function parseModuleFile(
  filePath: string,
  modulesRoot: string
): KapeModule | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const raw = yaml.load(content.split(/^#/m)[0]) as RawKapeModule | null;
    if (!raw?.Processors) {
      return null;
    }
    const referencedModules = raw.Processors.map(
      (processor) => processor.Executable ?? ""
    )
      .filter((executable) => executable.endsWith(MODULE_EXTENSION))
      .map(moduleNameFromFile);
    const [folder = ""] = path.relative(modulesRoot, filePath).split(path.sep);

    return {
      author: raw.Author ?? "Unknown",
      binaryUrl: raw.BinaryUrl,
      category: raw.Category?.trim() || folder,
      description: raw.Description ?? "",
      exportFormats: uniqueLowercaseFormats(raw),
      folder,
      isCompound: referencedModules.length > 0,
      name: moduleNameFromFile(filePath),
      referencedModules,
    };
  } catch (error) {
    console.warn(`Failed to parse ${filePath}:`, error);
    return null;
  }
}

export function loadAllModules(): KapeModule[] {
  if (moduleCache) {
    return moduleCache;
  }
  const modulesRoot = path.join(process.cwd(), MODULES_DIRECTORY);
  if (!fs.existsSync(modulesRoot)) {
    console.warn("KapeFiles Modules directory not found:", modulesRoot);
    return [];
  }
  const modules = listModuleFiles(modulesRoot)
    .map((filePath) => parseModuleFile(filePath, modulesRoot))
    .filter((module): module is KapeModule => module !== null)
    .toSorted((left, right) => left.name.localeCompare(right.name));
  moduleCache = modules;
  return modules;
}
