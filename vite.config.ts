import { defineConfig } from "vite-plus";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

const config = defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  staged: {
    "*": "vp check --fix"
  },
  lint: { options: { typeAware: true, typeCheck: true } },
  plugins: [
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tailwindcss(),
    tanstackStart(),
    viteReact()
  ],
  fmt: {
    trailingComma: "none"
  }
});

export default config;
