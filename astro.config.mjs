// @ts-check

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  // Emit flat .html files (e.g. dist/converter.html) rather than directory
  // indices (dist/converter/index.html). Combined with trailingSlash: "never"
  // this avoids a Netlify edge canonicalization loop: directory indices
  // canonicalize to the trailing-slash form, which the netlify.toml rules
  // force back to no-slash, producing ERR_TOO_MANY_REDIRECTS on /converter,
  // /artifacts, /builder, and /collections.
  build: {
    format: "file",
  },

  experimental: {
    svgo: true,
    // rustCompiler: true, // TODO: re-enable once <script is:inline define:vars> is supported (https://github.com/withastro/compiler-rs)
    queuedRendering: {
      enabled: true,
    },
  },
  integrations: [
    react(),
    sitemap({
      changefreq: "weekly",
      filter: (page) => !page.includes("?"),
      lastmod: new Date(),
      priority: 0.7,
    }),
  ],

  output: "static",

  site: "https://dfirhub.com",

  trailingSlash: "never",

  vite: {
    build: {
      rollupOptions: {
        external: ["/pagefind/pagefind.js"],
      },
    },
    optimizeDeps: {
      include: ["lucide-react", "framer-motion", "cmdk"],
    },
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    worker: { format: "es" },
  },
});
