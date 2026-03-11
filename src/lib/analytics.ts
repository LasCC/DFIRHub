/**
 * Lightweight PostHog analytics helper.
 * PostHog is loaded globally via `<script is:inline>` in PostHog.astro,
 * so `window.posthog` is available everywhere. This module provides
 * typed convenience wrappers for custom event tracking.
 */

declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: Record<string, unknown>) => void;
    };
  }
}

function capture(event: string, properties?: Record<string, unknown>) {
  window.posthog?.capture(event, properties);
}

// ── Search ──────────────────────────────────────────────────────────────

export function trackSearchQuery(query: string, resultCount: number) {
  capture("search_query", { query, result_count: resultCount });
}

export function trackSearchResultSelected(query: string, url: string) {
  capture("search_result_selected", { query, url });
}

// ── Artifact Navigation ─────────────────────────────────────────────────

export function trackArtifactViewed(slug: string, category: string) {
  capture("artifact_viewed", { slug, category });
}

export function trackCategoryFilterUsed(category: string) {
  capture("category_filter_used", { category });
}

// ── Copy Actions ────────────────────────────────────────────────────────

export function trackCopyPath(path: string, artifact?: string) {
  capture("copy_path", { path, artifact });
}

export function trackCopyCommand(format: string, artifact?: string) {
  capture("copy_command", { format, artifact });
}

// ── Converter ───────────────────────────────────────────────────────────

export function trackConverterConvert(backend: string, multiMode: boolean) {
  capture("converter_convert", { backend, multi_mode: multiMode });
}

export function trackConverterBackendChanged(backend: string) {
  capture("converter_backend_changed", { backend });
}

export function trackConverterExport(format: string, backendCount: number) {
  capture("converter_export", { format, backend_count: backendCount });
}

export function trackConverterShareLink() {
  capture("converter_share_link");
}

export function trackSigmaRuleImported(source: "sigmahq" | "example" | "file") {
  capture("sigma_rule_imported", { source });
}

// ── Builder ─────────────────────────────────────────────────────────────

export function trackBuilderDownload(format: string, targetCount: number) {
  capture("builder_download", { format, target_count: targetCount });
}

export function trackBuilderCopy(format: string, targetCount: number) {
  capture("builder_copy", { format, target_count: targetCount });
}
