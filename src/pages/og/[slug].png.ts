import type { APIRoute, GetStaticPaths } from "astro";

import { loadAllTargets } from "../../lib/kapefiles";
import type { KapeTarget } from "../../lib/kapefiles";
import { renderArtifactCard } from "../../lib/og-card";

const shouldSkipArtifactCards = process.env.SKIP_OG_IMAGES === "1";

export const getStaticPaths: GetStaticPaths = () =>
  shouldSkipArtifactCards
    ? []
    : loadAllTargets().map((target) => ({
        params: { slug: target.slug },
        props: { target },
      }));

export const GET: APIRoute = async ({ props }) => {
  const png = await renderArtifactCard(props.target as KapeTarget);
  return new Response(png as BodyInit, {
    headers: { "Content-Type": "image/png" },
  });
};
