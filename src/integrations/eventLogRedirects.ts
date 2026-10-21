import { writeFile } from "node:fs/promises";

import type { AstroIntegration } from "astro";

import { getEventLogRedirects } from "../lib/eventlogs";

export function eventLogRedirects(): AstroIntegration {
  return {
    hooks: {
      "astro:build:done": async ({ dir }) => {
        const rules = getEventLogRedirects()
          .map(([from, to]) => `${from} ${to} 301`)
          .join("\n");
        await writeFile(new URL("_redirects", dir), `${rules}\n`);
      },
    },
    name: "eventlog-redirects",
  };
}
