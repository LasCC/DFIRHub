import { useCallback, useRef, useState } from "react";

import { loadPagefind, runPagefindSearch } from "./pagefindClient";
import type {
  CategoryCounts,
  SearchHit,
  SearchOutcome,
} from "./pagefindClient";

export type SearchStatus = "idle" | "loading" | "ready" | "unavailable";

interface SearchState {
  categoryCounts: CategoryCounts;
  hits: SearchHit[];
  status: SearchStatus;
  total: number;
}

const MAX_HITS = 10;
const DEBOUNCE_MS = 120;

const EMPTY_STATE: SearchState = {
  categoryCounts: {},
  hits: [],
  status: "idle",
  total: 0,
};

export function usePagefindSearch() {
  const [state, setState] = useState<SearchState>(EMPTY_STATE);
  const latestRequestRef = useRef(0);

  const reset = useCallback(() => {
    latestRequestRef.current += 1;
    setState(EMPTY_STATE);
  }, []);

  const search = useCallback(
    async (
      query: string,
      category: string | null
    ): Promise<SearchOutcome | null> => {
      latestRequestRef.current += 1;
      const requestId = latestRequestRef.current;
      const isStale = () => requestId !== latestRequestRef.current;

      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        setState(EMPTY_STATE);
        return null;
      }

      setState((previous) => ({ ...previous, status: "loading" }));
      try {
        const pagefind = await loadPagefind();
        if (isStale()) {
          return null;
        }
        if (!pagefind) {
          setState({ ...EMPTY_STATE, status: "unavailable" });
          return null;
        }

        const outcome = await runPagefindSearch(pagefind, {
          category,
          debounceTimeoutMs: DEBOUNCE_MS,
          limit: MAX_HITS,
          query: trimmedQuery,
        });
        if (!outcome || isStale()) {
          return null;
        }

        setState({ ...outcome, status: "ready" });
        return outcome;
      } catch (error) {
        console.error("Search error:", error);
        if (!isStale()) {
          setState({ ...EMPTY_STATE, status: "ready" });
        }
        return null;
      }
    },
    []
  );

  return { ...state, reset, search };
}
