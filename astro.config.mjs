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
  experimental: {
    svgo: true,
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
