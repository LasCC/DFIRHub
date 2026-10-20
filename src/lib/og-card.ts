import { readFile } from "node:fs/promises";
import path from "node:path";

import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import type { Font } from "satori";

import { generateKapeCommand } from "./generators";
import { getHomepageData } from "./homepage";
import { getResolvedEntries } from "./kapefiles";
import type { KapeTarget } from "./kapefiles";
import type { RegistryArtifact } from "./registry";
import { SITE_URL } from "./seo";

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;
const CARD_PADDING = 64;
const PANEL_PADDING = 28;
const PANEL_INNER_WIDTH = CARD_WIDTH - CARD_PADDING * 2 - PANEL_PADDING * 2;
const MONO_CHARACTER_WIDTH_RATIO = 0.6;
const MAX_COMMAND_FONT_SIZE = 26;
const COMMAND_SAFETY_CHARACTERS = 2;
const GRID_CELL_SIZE = 24;
const GRID_REACH = 0.85;
const GRID_LIT_THRESHOLD = 0.04;
const SOURCE_DRIVE = "C:";
const DESTINATION_FOLDER = "D:\\Evidence";
const DEFAULT_EYEBROW = "Windows forensic artifacts reference";
const DEFAULT_HEADLINE =
  "Where the evidence lives, and the command to collect it";
const ARTIFACT_EYEBROW = "Windows forensic artifact";
const COLLECTION_EYEBROW = "KAPE triage collection";
const REGISTRY_EYEBROW = "Windows registry artifact";
const REGISTRY_CHIP = "Registry";
const MIN_KEY_PATH_FONT_SIZE = 20;
const KEY_PATH_SEPARATOR = "\\";
const KEY_PATH_ELLIPSIS = "…";
const SANS_FONT = "IBM Plex Sans";
const MONO_FONT = "JetBrains Mono";
const SITE_DOMAIN = new URL(SITE_URL).host;

const COLORS = {
  accent: "#34d399",
  background: "#09090b",
  chipBackground: "#16161a",
  chipBorder: "#26262b",
  foreground: "#fafafa",
  muted: "#a1a1aa",
  panel: "#0d1117",
  panelLine: "#30363d",
  panelMuted: "#8b949e",
} as const;

type StyleValue = string | number;
type CardChild = CardNode | string;

interface CardNode {
  type: string;
  props: {
    style: Record<string, StyleValue>;
    children?: CardChild | CardChild[];
    [attribute: string]: unknown;
  };
}

interface ArtifactCardContent {
  eyebrow: string;
  title: string;
  description: string;
  chip: string;
  commandRow: CardNode;
  footer: string;
  seed: string;
}

interface DefaultCardStat {
  value: string;
  label: string;
}

let fontsPromise: Promise<Font[]> | undefined;
let logoDataUriPromise: Promise<string> | undefined;

function readFontFile(packageName: string, fileName: string): Promise<Buffer> {
  return readFile(
    path.join(process.cwd(), "node_modules", packageName, "files", fileName)
  );
}

function loadFonts(): Promise<Font[]> {
  fontsPromise ??= Promise.all([
    readFontFile(
      "@fontsource/ibm-plex-sans",
      "ibm-plex-sans-latin-400-normal.woff"
    ),
    readFontFile(
      "@fontsource/ibm-plex-sans",
      "ibm-plex-sans-latin-600-normal.woff"
    ),
    readFontFile(
      "@fontsource/ibm-plex-sans",
      "ibm-plex-sans-latin-700-normal.woff"
    ),
    readFontFile(
      "@fontsource/jetbrains-mono",
      "jetbrains-mono-latin-400-normal.woff"
    ),
    readFontFile(
      "@fontsource/jetbrains-mono",
      "jetbrains-mono-latin-700-normal.woff"
    ),
  ]).then(([sans400, sans600, sans700, mono400, mono700]): Font[] => [
    { data: sans400, name: SANS_FONT, style: "normal", weight: 400 },
    { data: sans600, name: SANS_FONT, style: "normal", weight: 600 },
    { data: sans700, name: SANS_FONT, style: "normal", weight: 700 },
    { data: mono400, name: MONO_FONT, style: "normal", weight: 400 },
    { data: mono700, name: MONO_FONT, style: "normal", weight: 700 },
  ]);
  return fontsPromise;
}

function loadLogoDataUri(): Promise<string> {
  logoDataUriPromise ??= readFile(
    path.join(process.cwd(), "public", "favicon.svg")
  ).then((svg) => `data:image/svg+xml;base64,${svg.toString("base64")}`);
  return logoDataUriPromise;
}

function node(
  type: string,
  style: Record<string, StyleValue>,
  children?: CardChild | CardChild[],
  attributes: Record<string, unknown> = {}
): CardNode {
  return {
    type,
    props: {
      style: { boxSizing: "border-box", display: "flex", ...style },
      ...attributes,
      children,
    },
  };
}

function hashToUnit(text: string): number {
  let hash = 2_166_136_261;
  for (const character of text) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return ((hash >>> 0) % 10_000) / 10_000;
}

function buildGridDataUri(seed: string): string {
  const columns = Math.ceil(CARD_WIDTH / GRID_CELL_SIZE);
  const rows = Math.ceil(CARD_HEIGHT / GRID_CELL_SIZE);
  const squares: string[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const horizontal = column / columns;
      const vertical = row / rows;
      const distanceFromCorner = Math.hypot(1 - horizontal, vertical * 0.9);
      const falloff = Math.max(0, 1 - distanceFromCorner / GRID_REACH);
      const energy = hashToUnit(`${seed}:${column}:${row}`) * falloff;
      if (energy < GRID_LIT_THRESHOLD) {
        continue;
      }
      const size = 3 + energy * 7;
      const offset = (GRID_CELL_SIZE - size) / 2;
      squares.push(
        `<rect x="${(column * GRID_CELL_SIZE + offset).toFixed(1)}" y="${(row * GRID_CELL_SIZE + offset).toFixed(1)}" width="${size.toFixed(1)}" height="${size.toFixed(1)}" fill="${COLORS.accent}" fill-opacity="${Math.min(0.55, energy * 0.9).toFixed(2)}"/>`
      );
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}">${squares.join("")}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function pickTitleFontSize(title: string): number {
  if (title.length <= 14) {
    return 96;
  }
  if (title.length <= 22) {
    return 80;
  }
  if (title.length <= 30) {
    return 64;
  }
  return 52;
}

function buildCommandRow(commandTarget: string): CardNode {
  const command = generateKapeCommand({ name: commandTarget } as KapeTarget, {
    destination: DESTINATION_FOLDER,
    source: SOURCE_DRIVE,
  });
  const tokens = command.split(" ");
  const characterCount = `PS> ${command}`.length + COMMAND_SAFETY_CHARACTERS;
  const fontSize = Math.min(
    MAX_COMMAND_FONT_SIZE,
    Math.floor(
      PANEL_INNER_WIDTH / (characterCount * MONO_CHARACTER_WIDTH_RATIO)
    )
  );
  const gap = Math.round(fontSize * MONO_CHARACTER_WIDTH_RATIO);

  const tokenNodes = tokens.map((token, position): CardNode => {
    const isTarget = position === tokens.length - 1;
    const isFlag = token.startsWith("--");
    let color: string = COLORS.foreground;
    if (isTarget) {
      color = COLORS.accent;
    } else if (isFlag) {
      color = COLORS.panelMuted;
    }
    return node(
      "div",
      {
        color,
        flexShrink: 0,
        fontWeight: isTarget ? 700 : 400,
        marginRight: gap,
        whiteSpace: "nowrap",
      },
      token
    );
  });

  return node(
    "div",
    {
      alignItems: "center",
      fontFamily: MONO_FONT,
      fontSize,
    },
    [
      node(
        "div",
        { color: COLORS.panelMuted, flexShrink: 0, marginRight: gap },
        "PS>"
      ),
      ...tokenNodes,
    ]
  );
}

function shortenKeyPath(keyPath: string, maxLength: number): string {
  const segments = keyPath.split(KEY_PATH_SEPARATOR);
  if (keyPath.length <= maxLength || segments.length < 3) {
    return keyPath;
  }
  const [first, ...rest] = segments;
  const tail = [...rest];
  const fits = () =>
    [first, KEY_PATH_ELLIPSIS, ...tail].join(KEY_PATH_SEPARATOR).length <=
    maxLength;
  while (tail.length > 1 && !fits()) {
    tail.shift();
  }
  return [first, KEY_PATH_ELLIPSIS, ...tail].join(KEY_PATH_SEPARATOR);
}

function buildKeyPathRow(hive: string, keyPath: string): CardNode {
  const maxCharacters = Math.floor(
    PANEL_INNER_WIDTH / (MIN_KEY_PATH_FONT_SIZE * MONO_CHARACTER_WIDTH_RATIO)
  );
  const displayedPath = shortenKeyPath(
    keyPath,
    maxCharacters - hive.length - 1 - COMMAND_SAFETY_CHARACTERS
  );
  const characterCount =
    `${hive} ${displayedPath}`.length + COMMAND_SAFETY_CHARACTERS;
  const fontSize = Math.min(
    MAX_COMMAND_FONT_SIZE,
    Math.floor(
      PANEL_INNER_WIDTH / (characterCount * MONO_CHARACTER_WIDTH_RATIO)
    )
  );
  const gap = Math.round(fontSize * MONO_CHARACTER_WIDTH_RATIO);

  return node(
    "div",
    { alignItems: "center", fontFamily: MONO_FONT, fontSize },
    [
      node(
        "div",
        { color: COLORS.panelMuted, flexShrink: 0, marginRight: gap },
        hive
      ),
      node(
        "div",
        {
          color: COLORS.accent,
          flexShrink: 0,
          fontWeight: 700,
          whiteSpace: "nowrap",
        },
        displayedPath
      ),
    ]
  );
}

function buildBrand(logoUri: string): CardNode {
  return node("div", { alignItems: "center" }, [
    node("img", {}, undefined, { height: 40, src: logoUri, width: 40 }),
    node(
      "div",
      {
        color: COLORS.foreground,
        fontSize: 30,
        fontWeight: 600,
        marginLeft: 14,
      },
      "DFIRHub"
    ),
  ]);
}

function buildEyebrow(text: string, fontSize: number): CardNode {
  return node(
    "div",
    {
      color: COLORS.accent,
      fontFamily: MONO_FONT,
      fontSize,
      marginBottom: 18,
    },
    text
  );
}

function buildCardFrame(seed: string, children: CardNode[]): CardNode {
  return node(
    "div",
    {
      backgroundColor: COLORS.background,
      flexDirection: "column",
      fontFamily: SANS_FONT,
      height: "100%",
      padding: CARD_PADDING,
      position: "relative",
      width: "100%",
    },
    [
      node("img", { left: 0, position: "absolute", top: 0 }, undefined, {
        height: CARD_HEIGHT,
        src: buildGridDataUri(seed),
        width: CARD_WIDTH,
      }),
      ...children,
    ]
  );
}

function buildArtifactCard(
  content: ArtifactCardContent,
  logoUri: string
): CardNode {
  const titleFontSize = pickTitleFontSize(content.title);

  const header = node(
    "div",
    { alignItems: "center", justifyContent: "space-between", width: "100%" },
    [
      buildBrand(logoUri),
      node(
        "div",
        {
          backgroundColor: COLORS.chipBackground,
          border: `1px solid ${COLORS.chipBorder}`,
          borderRadius: 8,
          color: COLORS.foreground,
          fontSize: 24,
          fontWeight: 600,
          padding: "8px 18px",
        },
        content.chip
      ),
    ]
  );

  const body = node(
    "div",
    { flexDirection: "column", flexGrow: 1, justifyContent: "center" },
    [
      buildEyebrow(content.eyebrow, 24),
      node(
        "div",
        {
          color: COLORS.foreground,
          display: "block",
          fontSize: titleFontSize,
          fontWeight: 700,
          letterSpacing: -2,
          lineClamp: 2,
          lineHeight: 1.05,
        },
        content.title
      ),
      node(
        "div",
        {
          color: COLORS.muted,
          display: "block",
          fontSize: 28,
          lineClamp: 2,
          lineHeight: 1.4,
          marginTop: 20,
          maxWidth: 900,
        },
        content.description
      ),
    ]
  );

  const panel = node(
    "div",
    {
      backgroundColor: COLORS.panel,
      border: `1px solid ${COLORS.panelLine}`,
      borderRadius: 12,
      flexDirection: "column",
      padding: PANEL_PADDING,
      width: "100%",
    },
    [
      content.commandRow,
      node(
        "div",
        {
          color: COLORS.panelMuted,
          fontSize: 22,
          justifyContent: "space-between",
          marginTop: 18,
        },
        [node("div", {}, content.footer), node("div", {}, SITE_DOMAIN)]
      ),
    ]
  );

  return buildCardFrame(content.seed, [header, body, panel]);
}

function buildStat({ value, label }: DefaultCardStat): CardNode {
  return node("div", { flexDirection: "column", marginRight: 64 }, [
    node(
      "div",
      {
        color: COLORS.foreground,
        fontSize: 40,
        fontWeight: 600,
        letterSpacing: -1,
      },
      value
    ),
    node("div", { color: COLORS.muted, fontSize: 22, marginTop: 4 }, label),
  ]);
}

function buildDefaultCard(stats: DefaultCardStat[], logoUri: string): CardNode {
  const body = node(
    "div",
    { flexDirection: "column", flexGrow: 1, justifyContent: "center" },
    [
      buildEyebrow(DEFAULT_EYEBROW, 26),
      node(
        "div",
        {
          color: COLORS.foreground,
          display: "block",
          fontSize: 76,
          fontWeight: 700,
          letterSpacing: -2.5,
          lineHeight: 1.04,
        },
        DEFAULT_HEADLINE
      ),
    ]
  );

  const footer = node(
    "div",
    {
      alignItems: "flex-end",
      borderTop: `1px solid ${COLORS.chipBorder}`,
      justifyContent: "space-between",
      paddingTop: 28,
      width: "100%",
    },
    [
      node("div", {}, stats.map(buildStat)),
      node("div", { color: COLORS.muted, fontSize: 24 }, SITE_DOMAIN),
    ]
  );

  return buildCardFrame("dfirhub", [buildBrand(logoUri), body, footer]);
}

async function renderCard(
  build: (logoUri: string) => CardNode
): Promise<Uint8Array> {
  const [fonts, logoUri] = await Promise.all([loadFonts(), loadLogoDataUri()]);
  const svg = await satori(build(logoUri) as never, {
    fonts,
    height: CARD_HEIGHT,
    width: CARD_WIDTH,
  });
  return new Resvg(svg, {
    fitTo: { mode: "width", value: CARD_WIDTH },
  })
    .render()
    .asPng();
}

function describeContents(target: KapeTarget): string {
  const pathCount = getResolvedEntries(target).length;
  const pathLabel = `${pathCount.toLocaleString("en-US")} ${pathCount === 1 ? "path" : "paths"} on disk`;
  if (target.isCompound) {
    return `${target.referencedTargets.length} artifacts, ${pathLabel}`;
  }
  return pathLabel;
}

function describeArtifact(target: KapeTarget): string {
  if (target.description) {
    return target.description;
  }
  return target.isCompound
    ? `KAPE collection of ${target.name} artifacts for forensic triage.`
    : `Where ${target.name} lives on disk and the KAPE command to collect it.`;
}

export function renderArtifactCard(target: KapeTarget): Promise<Uint8Array> {
  const content: ArtifactCardContent = {
    chip: target.category,
    commandRow: buildCommandRow(target.name),
    description: describeArtifact(target),
    eyebrow: target.isCompound ? COLLECTION_EYEBROW : ARTIFACT_EYEBROW,
    footer: describeContents(target),
    seed: target.slug,
    title: target.name,
  };
  return renderCard((logoUri) => buildArtifactCard(content, logoUri));
}

function describeRegistryKeys(artifact: RegistryArtifact): string {
  const keyCount = artifact.entries.length;
  const keyLabel = `${keyCount} ${keyCount === 1 ? "key" : "keys"}`;
  return `${keyLabel} in ${artifact.hives.join(", ")}`;
}

export function renderRegistryCard(
  artifact: RegistryArtifact
): Promise<Uint8Array> {
  const [firstEntry] = artifact.entries;
  const content: ArtifactCardContent = {
    chip: REGISTRY_CHIP,
    commandRow: buildKeyPathRow(firstEntry.hive, firstEntry.keyPath),
    description:
      artifact.summary ||
      `Where ${artifact.name} lives in the registry and how to parse it.`,
    eyebrow: REGISTRY_EYEBROW,
    footer: describeRegistryKeys(artifact),
    seed: `registry-${artifact.slug}`,
    title: artifact.name,
  };
  return renderCard((logoUri) => buildArtifactCard(content, logoUri));
}

export function renderDefaultCard(): Promise<Uint8Array> {
  const { totalTargets, distinctPathCount, sigma } = getHomepageData();
  const formatCount = (count: number) => count.toLocaleString("en-US");
  const stats: DefaultCardStat[] = [
    { label: "forensic artifacts", value: formatCount(totalTargets) },
    { label: "paths on disk", value: formatCount(distinctPathCount) },
    { label: "Sigma rules", value: formatCount(sigma.ruleCount) },
  ];
  return renderCard((logoUri) => buildDefaultCard(stats, logoUri));
}
