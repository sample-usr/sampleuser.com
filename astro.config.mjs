import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  server: {
    host: "0.0.0.0",
  },
  site: "https://sampleuser.com",
  integrations: [mdx(), sitemap(), tailwind()],
});
