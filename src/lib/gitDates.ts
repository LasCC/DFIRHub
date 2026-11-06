import { execFileSync } from "node:child_process";

export interface GitDates {
  modified: string;
  published: string;
}

const SHALLOW_REPOSITORY_ARGS = ["rev-parse", "--is-shallow-repository"];

function runGit(repoDir: string, args: string[]): string {
  return execFileSync("git", ["-C", repoDir, ...args], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

export function isShallowRepository(repoDir: string): boolean {
  return runGit(repoDir, SHALLOW_REPOSITORY_ARGS) !== "false";
}

export function readGitDates(repoDir: string, pathSpec: string): GitDates | null {
  try {
    if (isShallowRepository(repoDir)) {
      return null;
    }
    const dates = runGit(repoDir, [
      "log",
      "--follow",
      "--format=%cI",
      "--",
      pathSpec,
    ]).split("\n");
    const modified = dates.at(0);
    const published = dates.at(-1);
    return modified && published ? { modified, published } : null;
  } catch {
    return null;
  }
}
