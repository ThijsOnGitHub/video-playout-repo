import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { sentryTanstackStart } from "@sentry/tanstackstart-react";

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    tsConfigPaths(),
    tanstackStart(),
    process.env.NODE_ENV === "production" &&
      sentryTanstackStart({
        org: "playoutserver",
        project: "javascript-tanstackstart-react",
        authToken: process.env.SENTRY_AUTH_TOKEN,
      }),
    nitro({ preset: "node" }),
    react(),
  ].filter(Boolean),
});
