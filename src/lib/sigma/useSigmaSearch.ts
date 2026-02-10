import { useCallback, useEffect, useRef, useState } from "react";

import type { SigmaRuleEntry } from "./sigma-search";

import {
  getSigmaRuleCount,
  loadSigmaIndex,
  searchSigmaRules,
} from "./sigma-search";

export function useSigmaSearch(enabled = false) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SigmaRuleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [indexReady, setIndexReady] = useState(false);
  // eslint-disable-next-line unicorn/no-useless-undefined -- React 19 requires explicit initial value
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!enabled || indexReady) {
      return;
    }

    let cancelled = false;

    setLoading(true);
    loadSigmaIndex()
      .then(() => {
        if (!cancelled) {
          setIndexReady(true);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      setLoading(false);
    };
  }, [enabled, indexReady]);

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (!value.trim()) {
        setResults([]);
        return;
      }

      if (!indexReady) {
        return;
      }

      debounceRef.current = setTimeout(() => {
        const found = searchSigmaRules(value);
        setResults(found);
      }, 150);
    },
    [indexReady]
  );

  const ruleCount = getSigmaRuleCount();

  return {
    query,
    setQuery: handleSearch,
    results,
    loading,
    indexReady,
    ruleCount,
  };
}
