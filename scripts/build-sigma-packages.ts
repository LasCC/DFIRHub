import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  backends,
  backendsWaitingForPysigmaRelease,
} from "../src/lib/sigma/backends";
import {
  CORE_PACKAGES,
  PYODIDE_CDN_BASE,
  PYODIDE_VERSION,
  SIGMA_LOCK_FILE,
  VALIDATOR_PACKAGE,
  toLockPackageName,
} from "../src/lib/sigma/worker/pyodide-packages";

interface LockPackage {
  name: string;
  version: string;
  file_name: string;
  install_dir: string;
  sha256: string;
  imports: string[];
  depends: string[];
  package_type?: string;
}

interface Lockfile {
  info: Record<string, unknown>;
  packages: Record<string, LockPackage>;
}

interface Micropip {
  install: (requirements: string | string[]) => Promise<void>;
  freeze: () => string;
}

const ROOT = path.join(new URL(".", import.meta.url).pathname, "..");
const OUTPUT_DIR = path.join(ROOT, "public", "sigma-packages");
const PYODIDE_DIR = path.join(
  ROOT,
  "node_modules",
  ".cache",
  `pyodide-${PYODIDE_VERSION}`
);
const PACKAGE_CACHE_DIR = path.join(PYODIDE_DIR, "packages");

const PINNED_REQUIREMENTS = [
  "pyyaml>=6.0.3",
  "pySigma==1.3.3",
  "pyparsing>=3.2.5,<3.3",
  "pySigma-pipeline-windows",
  "pySigma-pipeline-sysmon",
  "pySigma-validators-sigmahq",
  "pySigma-backend-elasticsearch==2.1.0",
  "pySigma-backend-loki==0.13.0",
  "pySigma-backend-sqlite==1.2.4",
];

const TYPING_ONLY_PACKAGE = /^types-|-stubs$/u;
const REMOTE_FILE = /^https?:\/\//u;

const ignoreOutput = () => null;

async function ensurePyodideRuntime(): Promise<void> {
  if (existsSync(path.join(PYODIDE_DIR, "pyodide.mjs"))) {
    return;
  }
  await mkdir(PYODIDE_DIR, { recursive: true });
  const tarballUrl = `https://registry.npmjs.org/pyodide/-/pyodide-${PYODIDE_VERSION}.tgz`;
  const response = await fetch(tarballUrl);
  if (!response.ok) {
    throw new Error(`Failed to download ${tarballUrl}: ${response.status}`);
  }
  const tarballPath = path.join(PYODIDE_DIR, "pyodide.tgz");
  await writeFile(tarballPath, new Uint8Array(await response.arrayBuffer()));
  const extract = spawnSync(
    "tar",
    ["xzf", tarballPath, "-C", PYODIDE_DIR, "--strip-components=1"],
    { stdio: "inherit" }
  );
  if (extract.status !== 0) {
    throw new Error("Failed to extract the Pyodide runtime");
  }
}

async function installPackages(): Promise<{
  lockfile: Lockfile;
  unavailable: string[];
}> {
  const { loadPyodide } = await import(path.join(PYODIDE_DIR, "pyodide.mjs"));
  const pyodide = await loadPyodide({
    packageCacheDir: PACKAGE_CACHE_DIR,
    stdout: ignoreOutput,
  });
  await pyodide.loadPackage("micropip", { messageCallback: ignoreOutput });
  const micropip = pyodide.pyimport("micropip") as Micropip;

  await micropip.install(PINNED_REQUIREMENTS);

  const unavailable: string[] = [];
  const candidates = [...backends, ...backendsWaitingForPysigmaRelease];
  for (const packageName of new Set(
    candidates.map((backend) => backend.package)
  )) {
    try {
      // oxlint-disable-next-line no-await-in-loop -- micropip installs must not overlap
      await micropip.install(packageName);
    } catch {
      unavailable.push(packageName);
    }
  }

  return { lockfile: JSON.parse(micropip.freeze()) as Lockfile, unavailable };
}

function collectRequiredPackages(
  lockfile: Lockfile,
  roots: string[]
): Set<string> {
  const required = new Set<string>();
  const pending = [...roots];
  while (pending.length > 0) {
    const name = pending.pop() as string;
    const entry = lockfile.packages[name];
    if (!entry || required.has(name)) {
      continue;
    }
    required.add(name);
    pending.push(
      ...entry.depends.filter(
        (dependency) => !TYPING_ONLY_PACKAGE.test(dependency)
      )
    );
  }
  return required;
}

async function downloadWheel(url: string, fileName: string): Promise<void> {
  const target = path.join(OUTPUT_DIR, fileName);
  if (existsSync(target)) {
    return;
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }
  await writeFile(target, new Uint8Array(await response.arrayBuffer()));
}

async function toServedEntry(entry: LockPackage): Promise<LockPackage> {
  const fileName = path.basename(entry.file_name);
  const depends = entry.depends.filter(
    (dependency) => !TYPING_ONLY_PACKAGE.test(dependency)
  );
  if (REMOTE_FILE.test(entry.file_name)) {
    await downloadWheel(entry.file_name, fileName);
    return { ...entry, depends, file_name: fileName };
  }
  return { ...entry, depends, file_name: `${PYODIDE_CDN_BASE}${fileName}` };
}

async function removeUnusedWheels(keptFiles: Set<string>): Promise<void> {
  const unusedWheels = (await readdir(OUTPUT_DIR)).filter(
    (fileName) => fileName.endsWith(".whl") && !keptFiles.has(fileName)
  );
  await Promise.all(
    unusedWheels.map((fileName) => rm(path.join(OUTPUT_DIR, fileName)))
  );
}

async function main(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await ensurePyodideRuntime();
  const { lockfile, unavailable } = await installPackages();

  const unavailableNames = new Set(unavailable.map(toLockPackageName));
  const backendRoots = backends
    .map((backend) => toLockPackageName(backend.package))
    .filter((name) => !unavailableNames.has(name));
  const required = collectRequiredPackages(lockfile, [
    ...CORE_PACKAGES,
    VALIDATOR_PACKAGE,
    ...backendRoots,
  ]);

  const sortedNames = [...required].toSorted();
  const servedEntries = await Promise.all(
    sortedNames.map((name) =>
      toServedEntry(lockfile.packages[name] as LockPackage)
    )
  );
  const packages = Object.fromEntries(
    sortedNames.map((name, index) => [name, servedEntries[index]])
  );

  const servedFiles = new Set(
    Object.values(packages)
      .map((entry) => entry.file_name)
      .filter((fileName) => !REMOTE_FILE.test(fileName))
  );
  await removeUnusedWheels(servedFiles);
  await writeFile(
    path.join(OUTPUT_DIR, SIGMA_LOCK_FILE),
    `${JSON.stringify({ info: lockfile.info, packages }, null, 2)}\n`
  );

  console.log(
    `Locked ${required.size} packages, ${servedFiles.size} wheels served from ${OUTPUT_DIR}`
  );
  if (unavailable.length > 0) {
    console.log(`Not compatible with pySigma 1.3.3: ${unavailable.join(", ")}`);
  }
  const nowCompatible = backendsWaitingForPysigmaRelease.filter(
    (backend) => !unavailableNames.has(toLockPackageName(backend.package))
  );
  if (nowCompatible.length > 0) {
    console.log(
      `Now compatible, remove waitingForPysigmaRelease in backends.ts: ${nowCompatible.map((backend) => backend.id).join(", ")}`
    );
  }
}

await main();
