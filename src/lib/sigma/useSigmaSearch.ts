import { useCallback, useEffect, useRef, useState } from "react";
import {
  getSigmaRuleCount,
  loadSigmaIndex,
  type SigmaRuleEntry,
  searchSigmaRules,
} from "./sigma-search";

export function useSigmaSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SigmaRuleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [indexReady, setIndexReady] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
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
    };
  }, []);

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

      if (!indexReady) return;

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
