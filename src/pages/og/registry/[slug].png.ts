import type { APIRoute, GetStaticPaths } from "astro";

import { renderRegistryCard } from "../../../lib/og-card";
import { loadRegistryArtifacts } from "../../../lib/registry";
import type { RegistryArtifact } from "../../../lib/registry";

const shouldSkipRegistryCards = process.env.SKIP_OG_IMAGES === "1";

export const getStaticPaths: GetStaticPaths = () =>
  shouldSkipRegistryCards
    ? []
    : loadRegistryArtifacts().map((artifact) => ({
        params: { slug: artifact.slug },
        props: { artifact },
      }));

export const GET: APIRoute = async ({ props }) => {
  const png = await renderRegistryCard(props.artifact as RegistryArtifact);
  return new Response(png as BodyInit, {
    headers: { "Content-Type": "image/png" },
  });
};
