---
name: Textbook Studio setup
description: Key decisions made when migrating this project from Lovable to Replit.
---

## Lovable AI Gateway → Direct Gemini API

The three AI server functions previously called `https://ai.gateway.lovable.dev/v1/chat/completions` with a `Lovable-API-Key` header. Replaced with direct calls to `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}`.

Model mapping:
- OCR (`ocr.functions.ts`): `gemini-2.0-flash` (has vision/multimodal)
- Structuring (`structure.functions.ts`): `gemini-2.5-flash`
- Glossary (`glossary.functions.ts`): `gemini-2.5-flash`

Response shape changed from OpenAI-compatible (`choices[0].message.content`) to Gemini native (`candidates[0].content.parts[0].text`).

**Why:** Lovable gateway only works inside Lovable's hosted environment.

## Auth: `@lovable.dev/cloud-auth-js` → Supabase OAuth

`src/integrations/oauth/index.ts` (formerly `lovable/index.ts`) exports `oauthClient.auth.signInWithOAuth` backed by `supabase.auth.signInWithOAuth`. `src/routes/auth.tsx` imports from the new path.

**Why:** `@lovable.dev/cloud-auth-js` is Lovable-environment-specific.

## Vite config: `@lovable.dev/vite-tanstack-config` → standard stack

`vite.config.ts` now imports directly from `@tanstack/react-start/plugin/vite` (`tanstackStart`), plus `@vitejs/plugin-react`, `@tailwindcss/vite`, and `vite-tsconfig-paths`. The two `@lovable.dev` npm packages are removed from `package.json`.

**Why:** Remove Lovable-specific tooling; the underlying packages are all standard.

## Error reporting: `lovable-error-reporting.ts` → `error-reporting.ts`

Renamed file and function (`reportLovableError` → `reportError`). Global window types updated (`__lovableEvents` → `__errorEvents`). These hooks are no-ops outside a Lovable editor preview anyway.

## Supabase project

The imported `.env` had a stale Supabase project (`tkqigeuemcoloxhdriwg`). The real project is `deazalzafwitqhluxrjb` (URL: `https://deazalzafwitqhluxrjb.supabase.co`).

## Environment variables

`SUPABASE_URL` and `VITE_SUPABASE_URL` set as plain env vars (shared). Everything else stored as Replit Secrets. Vite picks up `VITE_*` secrets/env vars at dev-server time and injects them into `import.meta.env`.

## Port

Configured `vite.config.ts` to use `port: 5000, host: "0.0.0.0", allowedHosts: true` so Replit's proxied iframe preview works.

## Documentation

`README.md` is the canonical project doc. No `replit.md`. `AGENTS.md` removed (was Lovable boilerplate).
