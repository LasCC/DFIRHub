import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hook for copy-to-clipboard feedback with proper cleanup.
 * Returns [copied, triggerCopied] — `copied` is true for `duration` ms after calling `triggerCopied`.
 */
export function useCopyFeedback(duration = 2000): [boolean, () => void] {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>();

  const triggerCopied = useCallback(() => {
    setCopied(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), duration);
  }, [duration]);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  return [copied, triggerCopied];
}

/**
 * Keyed variant — tracks which specific item was copied (e.g. by ID or path).
 * Returns [copiedKey, triggerCopied] — `copiedKey` matches the last key for `duration` ms.
 */
export function useCopyFeedbackKeyed<T>(
  duration = 2000
): [T | null, (key: T) => void] {
  const [copiedKey, setCopiedKey] = useState<T | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>();

  const triggerCopied = useCallback(
    (key: T) => {
      setCopiedKey(key);
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopiedKey(null), duration);
    },
    [duration]
  );

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  return [copiedKey, triggerCopied];
}
