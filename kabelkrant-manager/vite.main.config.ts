import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from 'vite';
// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    // Some libs that can run in both Web and Node.js, such as `axios`, we need to tell Vite to build them in Node.js.
    browserField: false,
    mainFields: ['module', 'jsnext:main', 'jsnext']
  },

  build: {
    sourcemap: true,
    rollupOptions: {
      external: [
        'node-cron',
        'crypto',
        'path',
        'get-video-duration'
      ]
    }
  },

  plugins: [sentryVitePlugin({
    org: "thijs-europe",
    project: "kabelkrant-player"
  })]
});