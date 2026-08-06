import { ExternalLink } from "lucide-react";
import { useMemo } from "react";

import {
  getRelatedKapeTargets,
  parseLogsourceFromYaml,
} from "@/lib/sigma/sigma-mapping";

interface RelatedArtifactsProps {
  rule: string;
}

export function RelatedArtifacts({ rule }: RelatedArtifactsProps) {
  const relatedTargets = useMemo(() => {
    const logsource = parseLogsourceFromYaml(rule);
    if (!logsource) {
      return [];
    }
    return getRelatedKapeTargets(logsource);
  }, [rule]);

  if (relatedTargets.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-overlay/[0.06] border-t bg-overlay/[0.01] px-4 py-3">
      <span className="mr-1 text-muted-foreground text-sm">
        <span className="font-medium text-foreground">
          Collect the evidence
        </span>
        {" · "}KAPE targets for this rule's log source:
      </span>
      {relatedTargets.map((target) => (
        <a
          className="flex items-center gap-1.5 rounded-lg border border-overlay/[0.06] bg-overlay/[0.02] px-3 py-1.5 text-sm text-muted-foreground transition-all hover:border-primary/30 hover:text-foreground"
          href={`/artifact/${target.slug}`}
          key={target.slug}
        >
          {target.name}
          <ExternalLink className="h-3 w-3" />
        </a>
      ))}
    </div>
  );
}
