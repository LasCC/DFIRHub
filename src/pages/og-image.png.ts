import type { APIRoute } from "astro";

import { renderDefaultCard } from "../lib/og-card";

export const GET: APIRoute = async () => {
  const png = await renderDefaultCard();
  return new Response(png as BodyInit, {
    headers: { "Content-Type": "image/png" },
  });
};
