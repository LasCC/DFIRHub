import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import yaml from "js-yaml";
import JSZip from "jszip";

interface SigmaRuleEntry {
  id: string;
  title: string;
  description: string;
  level: string;
  status: string;
  logsource: { category?: string; product?: string; service?: string };
  tags: string[];
  author: string;
  date: string;
  filename: string;
}

interface SigmaMeta {
  releaseTag: string;
  generatedAt: string;
  ruleCount: number;
}

const OUTPUT_DIR = join(import.meta.dir, "..", "public", "sigma-rules");
const GITHUB_API = "https://api.github.com/repos/SigmaHQ/sigma/releases";

async function getLatestRelease(): Promise<{
  tag: string;
  zipUrl: string;
}> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "DFIRHub-SigmaIndex",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(`${GITHUB_API}?per_page=20`, { headers });
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  const releases = (await res.json()) as Array<{
    tag_name: string;
    assets: Array<{ name: string; browser_download_url: string }>;
  }>;

  // Find latest release with tag pattern r* that has a core+ zip
  for (const release of releases) {
    if (!release.tag_name.startsWith("r")) continue;

    const zipAsset = release.assets.find(
      (a) => a.name.includes("sigma_all_rules") && a.name.endsWith(".zip")
    );
    if (zipAsset) {
      return { tag: release.tag_name, zipUrl: zipAsset.browser_download_url };
    }

    // Fallback: any zip asset with "core+" or "core" in the name
    const coreAsset = release.assets.find(
      (a) => a.name.includes("core") && a.name.endsWith(".zip")
    );
    if (coreAsset) {
      return { tag: release.tag_name, zipUrl: coreAsset.browser_download_url };
    }

    // Last fallback: first zip asset
    const anyZip = release.assets.find((a) => a.name.endsWith(".zip"));
    if (anyZip) {
      return { tag: release.tag_name, zipUrl: anyZip.browser_download_url };
    }
  }

  throw new Error("No suitable SigmaHQ release found");
}

function parseRule(
  content: string,
  filename: string
): { entry: SigmaRuleEntry; yaml: string } | null {
  try {
    const docs = yaml.loadAll(content) as Record<string, unknown>[];
    const doc = docs[0];
    if (!doc || typeof doc !== "object") return null;

    const id = String(doc.id ?? "");
    const title = String(doc.title ?? "");
    if (!(id && title)) return null;

    const logsource = (doc.logsource ?? {}) as Record<string, string>;
    const rawTags = Array.isArray(doc.tags) ? doc.tags : [];

    return {
      entry: {
        id,
        title,
        description: String(doc.description ?? ""),
        level: String(doc.level ?? "medium"),
        status: String(doc.status ?? ""),
        logsource: {
          category: logsource.category,
          product: logsource.product,
          service: logsource.service,
        },
        tags: rawTags.map(String),
        author: String(doc.author ?? ""),
        date: String(doc.date ?? ""),
        filename,
      },
      yaml: content,
    };
  } catch {
    console.warn(`Skipping malformed rule: ${filename}`);
    return null;
  }
}

async function checkExistingMeta(): Promise<SigmaMeta | null> {
  try {
    const content = await readFile(join(OUTPUT_DIR, "meta.json"), "utf-8");
    return JSON.parse(content) as SigmaMeta;
  } catch {
    return null;
  }
}

async function main() {
  console.log("Fetching latest SigmaHQ release...");
  const { tag, zipUrl } = await getLatestRelease();
  console.log(`Found release: ${tag}`);

  // Check if we already have this version
  const existingMeta = await checkExistingMeta();
  if (existingMeta?.releaseTag === tag) {
    console.log(`Already up to date (${tag}). Skipping.`);
    return;
  }

  console.log(`Downloading ZIP from: ${zipUrl}`);
  const zipRes = await fetch(zipUrl);
  if (!zipRes.ok) {
    throw new Error(`Failed to download ZIP: ${zipRes.status}`);
  }

  const zipBuffer = await zipRes.arrayBuffer();
  console.log(
    `Downloaded ${(zipBuffer.byteLength / 1024 / 1024).toFixed(1)}MB`
  );

  const zip = await JSZip.loadAsync(zipBuffer);
  const index: SigmaRuleEntry[] = [];
  const rules: Record<string, string> = {};

  const files = Object.entries(zip.files).filter(
    ([name, file]) => name.endsWith(".yml") && !file.dir
  );
  console.log(`Processing ${files.length} YAML files...`);

  let processed = 0;
  let skipped = 0;

  for (const [name, file] of files) {
    const content = await file.async("text");
    const result = parseRule(content, name);
    if (result) {
      index.push(result.entry);
      rules[result.entry.id] = result.yaml;
      processed++;
    } else {
      skipped++;
    }
  }

  console.log(`Processed: ${processed}, Skipped: ${skipped}`);

  // Sort by title for consistent output
  index.sort((a, b) => a.title.localeCompare(b.title));

  const meta: SigmaMeta = {
    releaseTag: tag,
    generatedAt: new Date().toISOString(),
    ruleCount: index.length,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });

  await Promise.all([
    writeFile(join(OUTPUT_DIR, "index.json"), JSON.stringify(index)),
    writeFile(join(OUTPUT_DIR, "rules.json"), JSON.stringify(rules)),
    writeFile(join(OUTPUT_DIR, "meta.json"), JSON.stringify(meta, null, 2)),
  ]);

  console.log(`Written to ${OUTPUT_DIR}:`);
  console.log(`  index.json: ${index.length} rules`);
  console.log(`  rules.json: ${Object.keys(rules).length} full YAML entries`);
  console.log(`  meta.json: ${meta.releaseTag}`);
}

main().catch((err) => {
  console.error("Failed to build sigma index:", err);
  process.exit(1);
});
