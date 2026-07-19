import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      // Use the Vercel preset when deploying to Vercel so Vinxi emits the correct
      // Build Output API format (.vercel/output/) with serverless functions and routing.
      server: {
        entry: "server",
        preset: process.env.VERCEL ? "vercel" : undefined,
      },
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  server: {
    port: 5000,
    host: "0.0.0.0",
    // Allow all hosts so Replit's proxied iframe preview works
    allowedHosts: true,
  },
});
