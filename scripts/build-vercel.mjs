#!/usr/bin/env node
/**
 * Vercel deployment build script for TanStack Start (Vite plugin, v1.x).
 *
 * TanStack Start v1 builds to dist/server + dist/client but has no built-in
 * Vercel adapter. This script converts that output into Vercel Build Output API
 * format (.vercel/output/) so Vercel routes SSR traffic correctly.
 *
 * Output layout:
 *   .vercel/output/static/        ← CDN-served client assets (dist/client/)
 *   .vercel/output/functions/
 *     __server.func/
 *       index.mjs                 ← esbuild-bundled, Node-adapted fetch handler
 *       .vc-config.json           ← tells Vercel: Node.js runtime, entry = index.mjs
 *   .vercel/output/config.json    ← routing: static → CDN, everything else → function
 */

import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { build as esbuild } from "esbuild";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = resolve(ROOT, ".vercel/output");
const FUNC = `${OUT}/functions/__server.func`;
const STATIC = `${OUT}/static`;

// ── 1. Run the normal TanStack Start build ───────────────────────────────────
console.log("▶ Building with vite…");
execSync("bun run build", { stdio: "inherit", cwd: ROOT });

// ── 2. Reset .vercel/output ──────────────────────────────────────────────────
console.log("▶ Preparing .vercel/output/…");
await rm(OUT, { recursive: true, force: true });
await mkdir(FUNC, { recursive: true });
await mkdir(STATIC, { recursive: true });

// ── 3. Copy client → static (CDN) ───────────────────────────────────────────
console.log("▶ Copying dist/client → static/…");
await cp(resolve(ROOT, "dist/client"), STATIC, { recursive: true });

// ── 4. Bundle dist/server/index.js into a single self-contained file ─────────
//   The Vite SSR build leaves runtime deps (supabase, etc.) as externals.
//   esbuild re-bundles everything into one ESM file so the Vercel function is
//   self-contained (no node_modules required in the function directory).
console.log("▶ Bundling dist/server/index.js with esbuild…");
await esbuild({
  entryPoints: [resolve(ROOT, "dist/server/server.js")],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: `${FUNC}/server-bundle.mjs`,
  // Keep built-in Node modules external — they're provided by the runtime.
  external: ["node:*", "fs", "path", "os", "crypto", "stream", "http", "https",
             "net", "tls", "zlib", "events", "util", "url", "buffer", "assert",
             "child_process", "worker_threads", "readline", "perf_hooks",
             "async_hooks", "v8", "vm", "module", "cluster", "dgram", "dns",
             "domain", "inspector", "querystring", "string_decoder", "timers",
             "tty", "punycode", "repl", "sys"],
  // Suppress warnings from packages we don't control.
  logLevel: "warning",
});

// ── 5. Write the Node.js / Vercel adapter ────────────────────────────────────
console.log("▶ Writing Node.js adapter…");
await writeFile(
  `${FUNC}/index.mjs`,
  `
import serverEntry from "./server-bundle.mjs";

/**
 * Vercel Node.js serverless function entry.
 * Adapts Vercel's (req, res) interface to the Web Fetch API that
 * TanStack Start's server entry expects.
 */
export default async function handler(req, res) {
  try {
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const proto = req.headers["x-forwarded-proto"] || "https";
    const url = new URL(req.url, \`\${proto}://\${host}\`);

    // Read body (skip for bodyless methods).
    let body = undefined;
    if (!["GET", "HEAD"].includes(req.method)) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      if (chunks.length > 0) body = Buffer.concat(chunks);
    }

    // Build a Web API Request.
    const webRequest = new Request(url.toString(), {
      method: req.method,
      headers: new Headers(
        Object.entries(req.headers)
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : String(v)])
      ),
      ...(body ? { body, duplex: "half" } : {}),
    });

    // Call the TanStack Start fetch handler.
    const webResponse = await serverEntry.fetch(webRequest);

    // Write status + headers back to Node.js response.
    res.statusCode = webResponse.status;
    for (const [key, value] of webResponse.headers.entries()) {
      res.setHeader(key, value);
    }

    // Stream or buffer the response body.
    if (webResponse.body) {
      const reader = webResponse.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
    }
    res.end();
  } catch (err) {
    console.error("[vercel-adapter] Unhandled error:", err);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
}
`.trimStart()
);

// ── 6. Write function metadata ────────────────────────────────────────────────
await writeFile(
  `${FUNC}/.vc-config.json`,
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
    },
    null,
    2
  )
);

// ── 7. Write routing config ───────────────────────────────────────────────────
console.log("▶ Writing config.json…");
await writeFile(
  `${OUT}/config.json`,
  JSON.stringify(
    {
      version: 3,
      routes: [
        // Immutable-cache hashed client assets.
        {
          src: "/_build/assets/.+",
          headers: { "cache-control": "public, max-age=31536000, immutable" },
          continue: true,
        },
        // Serve anything that exists as a static file (CDN).
        { handle: "filesystem" },
        // Everything else → SSR function.
        { src: "/(.*)", dest: "/__server" },
      ],
    },
    null,
    2
  )
);

console.log("✅ .vercel/output/ is ready.");
console.log("   Commit vercel.json, push, and redeploy on Vercel.");
