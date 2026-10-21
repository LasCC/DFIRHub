import type { APIRoute, GetStaticPaths } from "astro";

import { loadEventLogEvents } from "../../../../lib/eventlogs";
import type { EventLogEvent } from "../../../../lib/eventlogs";
import { renderEventLogCard } from "../../../../lib/og-card";

const shouldSkipEventLogCards = process.env.SKIP_OG_IMAGES === "1";

export const getStaticPaths: GetStaticPaths = () =>
  shouldSkipEventLogCards
    ? []
    : loadEventLogEvents().map((event) => ({
        params: { channel: event.channelSlug, id: String(event.eventId) },
        props: { event },
      }));

export const GET: APIRoute = async ({ props }) => {
  const png = await renderEventLogCard(props.event as EventLogEvent);
  return new Response(png as BodyInit, {
    headers: { "Content-Type": "image/png" },
  });
};
