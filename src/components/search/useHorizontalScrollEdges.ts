import { useCallback, useEffect, useState } from "react";

interface ScrollEdges {
  canScrollEnd: boolean;
  canScrollStart: boolean;
}

const EDGE_TOLERANCE_PX = 1;

export function useHorizontalScrollEdges() {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState<ScrollEdges>({
    canScrollEnd: false,
    canScrollStart: false,
  });

  const measure = useCallback(() => {
    if (!element) {
      return;
    }
    const canScrollStart = element.scrollLeft > EDGE_TOLERANCE_PX;
    const canScrollEnd =
      element.scrollLeft + element.clientWidth <
      element.scrollWidth - EDGE_TOLERANCE_PX;
    setEdges((previous) =>
      previous.canScrollStart === canScrollStart &&
      previous.canScrollEnd === canScrollEnd
        ? previous
        : { canScrollEnd, canScrollStart }
    );
  }, [element]);

  useEffect(() => {
    if (!element) {
      return;
    }
    const frame = requestAnimationFrame(measure);
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(element);
    const mutationObserver = new MutationObserver(measure);
    mutationObserver.observe(element, {
      characterData: true,
      childList: true,
      subtree: true,
    });
    element.addEventListener("scroll", measure, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      element.removeEventListener("scroll", measure);
    };
  }, [element, measure]);

  return { edges, scrollRef: setElement };
}
