import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: process.env.SENTRY_ORG || "my-org",
      project: process.env.SENTRY_PROJECT || "my-project",
      authToken: process.env.SENTRY_AUTH_TOKEN
    }),
  ],
  build: {
    sourcemap: true, // Source map generation must be turned on
  },
})
