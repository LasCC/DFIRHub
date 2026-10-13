import { useCallback, useState } from "react";

import type { SearchHitKind } from "./pagefindClient";

export interface RecentArtifact {
  category: string;
  kind: SearchHitKind;
  title: string;
  url: string;
}

const STORAGE_KEY = "dfirhub-recent-artifacts";
const MAX_RECENT = 5;

const isRecentArtifact = (value: unknown): value is RecentArtifact => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.url === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.category === "string" &&
    (candidate.kind === "Artifact" || candidate.kind === "Collection")
  );
};

const readRecentArtifacts = (): RecentArtifact[] => {
  try {
    const stored: unknown = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "[]"
    );
    return Array.isArray(stored)
      ? stored.filter(isRecentArtifact).slice(0, MAX_RECENT)
      : [];
  } catch {
    return [];
  }
};

const writeRecentArtifacts = (artifacts: RecentArtifact[]): boolean => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(artifacts));
    return true;
  } catch {
    return false;
  }
};

export function useRecentArtifacts() {
  const [recent, setRecent] = useState<RecentArtifact[]>([]);

  const refresh = useCallback(() => {
    setRecent(readRecentArtifacts());
  }, []);

  const remember = useCallback((artifact: RecentArtifact) => {
    const next = [
      artifact,
      ...readRecentArtifacts().filter(({ url }) => url !== artifact.url),
    ].slice(0, MAX_RECENT);
    writeRecentArtifacts(next);
  }, []);

  return { recent, refresh, remember };
}
