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
    if (!logsource) return [];
    return getRelatedKapeTargets(logsource);
  }, [rule]);

  if (relatedTargets.length === 0) return null;

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
      <h3 className="mb-3 text-muted-foreground text-xs uppercase tracking-wider">
        Related KAPE Targets
      </h3>
      <div className="flex flex-wrap gap-2">
        {relatedTargets.map((target) => (
          <a
            className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-sm text-muted-foreground transition-all hover:border-primary/30 hover:text-foreground"
            href={`/artifact/${target.slug}`}
            key={target.slug}
          >
            {target.name}
            <ExternalLink className="h-3 w-3" />
          </a>
        ))}
      </div>
    </div>
  );
}
