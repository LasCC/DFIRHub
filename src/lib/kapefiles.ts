import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

// KapeFile Target structure
export interface KapeTarget {
  name: string; // From filename (e.g., "Prefetch")
  description: string; // From Description field
  author: string;
  version: string;
  id: string; // GUID
  recreateDirectories: boolean;
  category: string; // Folder name (Windows, Browsers, Apps, etc.)
  slug: string; // URL-safe identifier
  sourceFile: string; // Original .tkape filename
  isCompound: boolean; // References other targets?
  targets: KapeTargetEntry[];
  referencedTargets: string[]; // For compounds - list of referenced .tkape files
  documentation: string[]; // Comments/documentation lines from file
}

export interface KapeTargetEntry {
  name: string;
  category: string;
  path: string;
  fileMask?: string;
  recursive?: boolean;
  comment?: string;
}

// Raw YAML structure from .tkape files
interface RawKapeTarget {
  Description?: string;
  Author?: string;
  Version?: string;
  Id?: string;
  RecreateDirectories?: boolean;
  Targets?: RawKapeTargetEntry[];
}

interface RawKapeTargetEntry {
  Name?: string;
  Category?: string;
  Path?: string;
  FileMask?: string;
  Recursive?: boolean;
  Comment?: string;
}

// Cache for loaded targets
let targetCache: KapeTarget[] | null = null;

// Create URL-safe slug from filename
function createSlug(filename: string): string {
  return filename
    .replace(/\.tkape$/, "")
    .replace(/^!/, "") // Remove leading ! from compound targets
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

// Parse a single .tkape file
function parseKapeFile(filePath: string, category: string): KapeTarget | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const filename = path.basename(filePath);

    // Extract documentation comments (lines starting with #)
    const documentation: string[] = [];
    const lines = content.split("\n");
    let inDocSection = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("# Documentation")) {
        inDocSection = true;
        continue;
      }
      if (inDocSection && trimmed.startsWith("#")) {
        const docLine = trimmed.replace(/^#\s*/, "").trim();
        if (docLine && docLine !== "N/A") {
          documentation.push(docLine);
        }
      }
    }

    // Parse YAML content (only the part before comments)
    const yamlContent = content.split(/^#/m)[0];
    const raw = yaml.load(yamlContent) as RawKapeTarget;

    if (!raw?.Targets) {
      return null;
    }

    // Parse target entries
    const targets: KapeTargetEntry[] = (raw.Targets || []).map(
      (t: RawKapeTargetEntry) => ({
        name: t.Name || "",
        category: t.Category || "",
        path: t.Path || "",
        fileMask: t.FileMask,
        recursive: t.Recursive,
        comment: t.Comment,
      })
    );

    // Detect if this is a compound target (references other .tkape files)
    const isCompound = targets.some((t) => t.path.endsWith(".tkape"));

    // Extract referenced targets for compounds
    const referencedTargets = isCompound
      ? targets.map((t) => t.path).filter((p) => p.endsWith(".tkape"))
      : [];

    return {
      name: filename.replace(/\.tkape$/, "").replace(/^!/, ""),
      description: raw.Description || "",
      author: raw.Author || "Unknown",
      version: raw.Version?.toString() || "1.0",
      id: raw.Id || "",
      recreateDirectories: raw.RecreateDirectories ?? true,
      category,
      slug: createSlug(filename),
      sourceFile: filename,
      isCompound,
      targets,
      referencedTargets,
      documentation,
    };
  } catch (error) {
    console.warn(`Failed to parse ${filePath}:`, error);
    return null;
  }
}

// Load all targets from the KapeFiles submodule
export function loadAllTargets(): KapeTarget[] {
  if (targetCache) {
    return targetCache;
  }

  const targets: KapeTarget[] = [];
  const targetsDir = path.join(process.cwd(), "src/content/kapefiles/Targets");

  if (!fs.existsSync(targetsDir)) {
    console.warn("KapeFiles Targets directory not found:", targetsDir);
    return [];
  }

  // Get all category directories
  const categories = fs
    .readdirSync(targetsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => d.name);

  for (const category of categories) {
    // Skip disabled targets
    if (category === "!Disabled") {
      continue;
    }

    const categoryDir = path.join(targetsDir, category);
    const files = fs
      .readdirSync(categoryDir)
      .filter((f) => f.endsWith(".tkape"));

    for (const file of files) {
      const filePath = path.join(categoryDir, file);
      const target = parseKapeFile(filePath, category);

      if (target) {
        targets.push(target);
      }
    }
  }

  targetCache = targets;
  return targets;
}

// Get target by slug
export function getTargetBySlug(slug: string): KapeTarget | undefined {
  const targets = loadAllTargets();
  return targets.find((t) => t.slug === slug);
}

// Get targets by category
export function getTargetsByCategory(category: string): KapeTarget[] {
  const targets = loadAllTargets();
  return targets.filter(
    (t) => t.category.toLowerCase() === category.toLowerCase()
  );
}

// Get all compound targets (triage collections)
export function getCompoundTargets(): KapeTarget[] {
  const targets = loadAllTargets();
  return targets.filter((t) => t.isCompound);
}

// Get non-compound targets only
export function getIndividualTargets(): KapeTarget[] {
  const targets = loadAllTargets();
  return targets.filter((t) => !t.isCompound);
}

// Resolve compound target to its individual targets
export function resolveCompoundReferences(target: KapeTarget): KapeTarget[] {
  if (!target.isCompound) {
    return [target];
  }

  const allTargets = loadAllTargets();
  const resolved: KapeTarget[] = [];
  const seen = new Set<string>();

  // Build lookup maps for O(1) resolution instead of O(n) linear scans
  const slugMap = new Map(allTargets.map((t) => [t.slug, t]));
  const sourceMap = new Map(
    allTargets.map((t) => [
      t.sourceFile
        .replace(/\.tkape$/, "")
        .replace(/^!/, "")
        .toLowerCase(),
      t,
    ])
  );

  function resolve(refs: string[]) {
    for (const ref of refs) {
      // Normalize the reference
      const refName = path
        .basename(ref)
        .replace(/\.tkape$/, "")
        .replace(/^!/, "");
      const refSlug = createSlug(refName);

      if (seen.has(refSlug)) {
        continue;
      }
      seen.add(refSlug);

      const foundTarget =
        slugMap.get(refSlug) || sourceMap.get(refName.toLowerCase());

      if (foundTarget) {
        if (foundTarget.isCompound) {
          resolve(foundTarget.referencedTargets);
        } else {
          resolved.push(foundTarget);
        }
      }
    }
  }

  resolve(target.referencedTargets);
  return resolved;
}

// Find collections that include a specific target
export function findCollectionsContaining(targetSlug: string): KapeTarget[] {
  const compounds = getCompoundTargets();
  const target = getTargetBySlug(targetSlug);

  if (!target) {
    return [];
  }

  return compounds.filter((compound) => {
    const resolved = resolveCompoundReferences(compound);
    return resolved.some((t) => t.slug === targetSlug);
  });
}

// Search targets
export function searchTargets(query: string): KapeTarget[] {
  const targets = loadAllTargets();
  const queryLower = query.toLowerCase();

  return targets.filter((t) => {
    const searchableText = [
      t.name,
      t.description,
      t.author,
      t.category,
      ...t.targets.map(
        (entry) => `${entry.name} ${entry.path} ${entry.fileMask || ""}`
      ),
      ...t.documentation,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(queryLower);
  });
}

// Get all unique categories
export function getCategories(): string[] {
  const targets = loadAllTargets();
  return [...new Set(targets.map((t) => t.category))].sort();
}

// Get statistics
export function getStats(): {
  total: number;
  compounds: number;
  individuals: number;
  byCategory: Record<string, number>;
} {
  const targets = loadAllTargets();

  const byCategory: Record<string, number> = {};
  let compounds = 0;
  let individuals = 0;

  for (const target of targets) {
    if (target.isCompound) {
      compounds++;
    } else {
      individuals++;
    }

    byCategory[target.category] = (byCategory[target.category] || 0) + 1;
  }

  return {
    total: targets.length,
    compounds,
    individuals,
    byCategory,
  };
}

// Get all paths from a target (useful for display and commands)
export function getTargetPaths(target: KapeTarget): Array<{
  name: string;
  path: string;
  fileMask?: string;
}> {
  if (target.isCompound) {
    const resolved = resolveCompoundReferences(target);
    return resolved.flatMap((t) => getTargetPaths(t));
  }

  return target.targets
    .filter((entry) => !entry.path.endsWith(".tkape"))
    .map((entry) => ({
      name: entry.name,
      path: entry.path,
      fileMask: entry.fileMask,
    }));
}

// Generate KAPE command for a target
export function generateKapeCommand(
  targetName: string,
  options: {
    source?: string;
    destination?: string;
    vhdx?: boolean;
    vss?: boolean;
  } = {}
): string {
  const {
    source = "C:",
    destination = "D:\\Evidence",
    vhdx = false,
    vss = false,
  } = options;

  let cmd = `kape.exe --tsource ${source} --tdest ${destination} --target ${targetName}`;

  if (vhdx) {
    cmd += " --vhdx evidence";
  }
  if (vss) {
    cmd += " --vss";
  }

  return cmd;
}

// Generate PowerShell collection script for a target
export function generatePowerShellScript(target: KapeTarget): string {
  const paths = getTargetPaths(target);

  const lines = [
    "# PowerShell Artifact Collection Script",
    `# Target: ${target.name}`,
    "# Generated by DFIRHub",
    "",
    "$ErrorActionPreference = 'SilentlyContinue'",
    "$destBase = 'D:\\Evidence'",
    "",
  ];

  for (const entry of paths) {
    const safeName = entry.name.replace(/[^a-zA-Z0-9]/g, "_");
    const destPath = `$destBase\\${safeName}`;

    lines.push(`# ${entry.name}`);
    lines.push(`$dest = "${destPath}"`);
    lines.push("New-Item -ItemType Directory -Path $dest -Force | Out-Null");

    if (entry.fileMask) {
      lines.push(
        `Copy-Item -Path "${entry.path}${entry.fileMask}" -Destination $dest -Recurse -Force`
      );
    } else {
      lines.push(
        `Copy-Item -Path "${entry.path}*" -Destination $dest -Recurse -Force`
      );
    }
    lines.push("");
  }

  lines.push("Write-Host 'Collection complete!'");

  return lines.join("\n");
}

// Clear the cache (useful for development)
export function clearCache(): void {
  targetCache = null;
}
