import type { ReactNode } from "react";

import { escapeRegExp } from "./escapeRegExp";

interface HighlightedTextProps {
  query: string;
  text: string;
}

interface TextSegment {
  isMatch: boolean;
  offset: number;
  text: string;
}

const TERM_SEPARATORS = /[\s.\\/_-]+/u;

const splitByQueryTerms = (text: string, query: string): TextSegment[] => {
  const terms = query
    .trim()
    .split(TERM_SEPARATORS)
    .filter(Boolean)
    .map(escapeRegExp);
  if (terms.length === 0) {
    return [{ isMatch: false, offset: 0, text }];
  }

  const pattern = new RegExp(`(${terms.join("|")})`, "giu");
  const segments: TextSegment[] = [];
  let offset = 0;
  for (const [index, part] of text.split(pattern).entries()) {
    if (part) {
      segments.push({ isMatch: index % 2 === 1, offset, text: part });
    }
    offset += part.length;
  }
  return segments;
};

export function HighlightedText({
  query,
  text,
}: HighlightedTextProps): ReactNode {
  return splitByQueryTerms(text, query).map((segment) =>
    segment.isMatch ? (
      <mark
        className="bg-transparent font-semibold text-foreground underline decoration-2 decoration-primary underline-offset-[3px]"
        key={segment.offset}
      >
        {segment.text}
      </mark>
    ) : (
      <span key={segment.offset}>{segment.text}</span>
    )
  );
}
