import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { AstroIntegration } from "astro";

const SITEMAP_FILE_PATTERN = /^sitemap-\d+\.xml$/u;
const URL_BLOCK_PATTERN = /<url>(?<body>.*?)<\/url>/gsu;
const LOC_PATTERN = /<loc>(?<loc>[^<]+)<\/loc>/u;
const NOINDEX_PATTERN = /<meta name="robots" content="noindex/u;
const DATE_MODIFIED_PATTERN = /"dateModified":"(?<date>[^"]+)"/u;

function htmlFileForUrl(distDirectory: string, pageUrl: string): string {
  const { pathname } = new URL(pageUrl);
  const relativePath =
    pathname === "/"
      ? "index.html"
      : `${decodeURIComponent(pathname).slice(1)}.html`;
  return path.join(distDirectory, relativePath);
}

async function readPageHtml(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

async function refineUrlBlock(
  distDirectory: string,
  body: string
): Promise<string | null> {
  const loc = LOC_PATTERN.exec(body)?.groups?.loc;
  if (!loc) {
    return `<url>${body}</url>`;
  }
  const html = await readPageHtml(htmlFileForUrl(distDirectory, loc));
  if (html && NOINDEX_PATTERN.test(html)) {
    return null;
  }
  const dateModified = html
    ? DATE_MODIFIED_PATTERN.exec(html)?.groups?.date
    : undefined;
  if (!dateModified || body.includes("<lastmod>")) {
    return `<url>${body}</url>`;
  }
  const lastmod = new Date(dateModified).toISOString();
  return `<url>${body}<lastmod>${lastmod}</lastmod></url>`;
}

async function refineSitemap(distDirectory: string, sitemapPath: string) {
  const xml = await readFile(sitemapPath, "utf-8");
  const blocks = [...xml.matchAll(URL_BLOCK_PATTERN)];
  const refined = await Promise.all(
    blocks.map((block) =>
      refineUrlBlock(distDirectory, block.groups?.body ?? "")
    )
  );
  const firstBlockStart = blocks[0]?.index ?? xml.indexOf("</urlset>");
  const lastBlock = blocks.at(-1);
  const afterBlocks = lastBlock
    ? (lastBlock.index ?? 0) + lastBlock[0].length
    : firstBlockStart;
  const keptBlocks = refined.filter((block): block is string => block !== null);
  await writeFile(
    sitemapPath,
    `${xml.slice(0, firstBlockStart)}${keptBlocks.join("")}${xml.slice(afterBlocks)}`
  );
  return {
    dropped: blocks.length - keptBlocks.length,
    kept: keptBlocks.length,
  };
}

export function sitemapRefinements(): AstroIntegration {
  return {
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const distDirectory = fileURLToPath(dir);
        const sitemapFiles = (await readdir(distDirectory)).filter((name) =>
          SITEMAP_FILE_PATTERN.test(name)
        );
        const results = await Promise.all(
          sitemapFiles.map((fileName) =>
            refineSitemap(distDirectory, path.join(distDirectory, fileName))
          )
        );
        for (const [index, { dropped, kept }] of results.entries()) {
          logger.info(
            `${sitemapFiles[index]}: kept ${kept} URLs, dropped ${dropped} noindex pages`
          );
        }
      },
    },
    name: "sitemap-refinements",
  };
}
