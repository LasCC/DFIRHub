import {
  ARTIFACTS_PATH,
  BUILDER_PATH,
  COLLECTIONS_PATH,
  CONVERTER_PATH,
  EVENTLOG_INDEX_PATH,
  HOME_PATH,
  REGISTRY_INDEX_PATH,
} from "./routes";

export interface NavItem {
  key: string;
  href: string;
  label: string;
  shortcut: string;
  footerLabel?: string;
  shortcutDescription?: string;
}

export interface NavShortcut {
  keys: [string, string];
  href: string;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    footerLabel: "All Artifacts",
    href: ARTIFACTS_PATH,
    key: "artifacts",
    label: "Artifacts",
    shortcut: "a",
    shortcutDescription: "Go to all artifacts",
  },
  {
    href: COLLECTIONS_PATH,
    key: "collections",
    label: "Collections",
    shortcut: "c",
  },
  {
    footerLabel: "Registry Artifacts",
    href: REGISTRY_INDEX_PATH,
    key: "registry",
    label: "Registry",
    shortcut: "r",
    shortcutDescription: "Go to registry artifacts",
  },
  {
    footerLabel: "Event Logs",
    href: EVENTLOG_INDEX_PATH,
    key: "eventlogs",
    label: "Event logs",
    shortcut: "e",
  },
  {
    footerLabel: "Command Builder",
    href: BUILDER_PATH,
    key: "builder",
    label: "Builder",
    shortcut: "b",
  },
  {
    footerLabel: "Sigma Converter",
    href: CONVERTER_PATH,
    key: "converter",
    label: "Converter",
    shortcut: "s",
  },
];

export const NAV_SHORTCUTS: NavShortcut[] = [
  { description: "Go to home", href: HOME_PATH, keys: ["g", "h"] },
  ...NAV_ITEMS.map((item) => ({
    description: item.shortcutDescription ?? `Go to ${item.label.toLowerCase()}`,
    href: item.href,
    keys: ["g", item.shortcut] as [string, string],
  })),
];
