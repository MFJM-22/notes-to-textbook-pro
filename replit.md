# Textbook Studio

A web app for JSS1 & JSS2 teachers in Nigeria that turns scanned handwritten lesson notes into publication-ready textbooks.

## Stack

- **Framework**: TanStack Start (SSR) + React 19
- **Styling**: Tailwind CSS v4 + Radix UI (shadcn/ui components)
- **Backend**: Supabase (auth, database, storage) — project `deazalzafwitqhluxrjb`
- **AI**: Google Gemini API directly (`generativelanguage.googleapis.com`)
  - OCR: `gemini-2.0-flash` (vision)
  - Structuring & glossary: `gemini-2.5-flash`
- **Export**: `docx` npm package for Word file generation
- **Package manager**: `bun`

## Features

1. **Scan & OCR** — upload photos of handwritten notes; Gemini vision extracts text
2. **AI structuring** — organises content into Weeks → Topics, tailored to the Nigerian JSS curriculum (subject, class, term)
3. **Review board** — editable week/topic tree with inline editing
4. **Glossary generation** — 15–40 key terms with kid-friendly definitions
5. **Export** — `.docx` download (cover page, TOC, weeks, glossary) + browser print-to-PDF

## Key source files

- `src/routes/index.tsx` — landing page
- `src/routes/auth.tsx` — sign-in / sign-up (email + Google OAuth via Supabase)
- `src/routes/_authenticated/` — authenticated app routes
- `src/lib/ocr.functions.ts` — Gemini vision OCR server function
- `src/lib/structure.functions.ts` — AI structuring server function
- `src/lib/glossary.functions.ts` — AI glossary generation server function
- `src/lib/export.functions.ts` — Word export server function
- `src/integrations/supabase/` — Supabase client setup
- `src/integrations/lovable/index.ts` — Google OAuth wrapper (uses Supabase directly)
- `supabase/migrations/` — database schema

## Running on Replit

```bash
bun run dev   # starts on port 5000
```

The "Start application" workflow runs `bun run dev` and serves the app on port 5000.

## Secrets (stored in Replit Secrets)

| Secret | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL (also set as plain env var) |
| `VITE_SUPABASE_URL` | Same — Vite client-side injection |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase anon key (server-side) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Same — Vite client-side injection |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — bypasses RLS (server only) |
| `GEMINI_API_KEY` | Google Gemini API key |

## Google OAuth

Google sign-in routes through Supabase's built-in OAuth. To enable it:
1. Supabase dashboard → Authentication → Providers → Google
2. Add your Google OAuth client ID & secret
3. Set the redirect URL shown there in your Google Cloud Console

## Notes

- The hydration mismatch warning in dev logs is benign — a known TanStack Start SSR/client dev-mode quirk.
- `@lovable.dev/cloud-auth-js` and the Lovable AI Gateway have been removed; the app now calls Google's Gemini API directly.

## User preferences

_None recorded yet._
