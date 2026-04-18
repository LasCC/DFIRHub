// dfirhub service worker
//
// Scope: the only reason this SW exists is to cache the large Pyodide runtime
// and PyPI wheels for the Sigma converter so repeat visits don't re-download
// multi-megabyte WASM/wheel files.
//
// Intentionally NO caching of any origin HTML or Astro-built assets:
// the site ships content-hashed asset filenames, so a stale HTML cache
// references asset hashes that no longer exist after each deploy and
// the page 404s its own JS/CSS. Network handles those fine on its own.
//
// Bump CACHE_VERSION whenever the cached-URL matchers change so old
// clients discard their cache on next activation.
const CACHE_VERSION = "v4";
const PYODIDE_CACHE = `dfirhub-pyodide-${CACHE_VERSION}`;

const PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v0.29.3/full/";
const PYPI_CDN = "https://files.pythonhosted.org/";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== PYODIDE_CACHE)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Cache-first for the Pyodide runtime and PyPI wheels only.
  if (url.href.startsWith(PYODIDE_CDN) || url.href.startsWith(PYPI_CDN)) {
    event.respondWith(
      caches.open(PYODIDE_CACHE).then((cache) =>
        cache.match(event.request).then(
          (cached) =>
            cached ||
            fetch(event.request).then((response) => {
              if (response.ok) {
                cache.put(event.request, response.clone());
              }
              return response;
            })
        )
      )
    );
    return;
  }

  // Everything else: fall through to the network. Don't call respondWith
  // so the browser's default handling applies.
});
