# Textbook Studio

A web app for JSS1 & JSS2 teachers in Nigeria that turns scanned handwritten lesson notes into publication-ready textbooks.

## Stack

- **Framework**: TanStack Start (SSR) + React 19
- **Styling**: Tailwind CSS v4 + Radix UI (shadcn/ui components)
- **Backend**: Supabase (auth, database, storage)
- **AI**: Lovable AI Gateway → Google Gemini (OCR, structuring, glossary)
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
- `src/routes/_authenticated/` — authenticated app routes
- `src/lib/*.functions.ts` — server functions (OCR, structuring, glossary, export)
- `src/integrations/` — Supabase client setup
- `supabase/migrations/` — database schema

## Environment

The project reads from `.env` for Supabase connection details. On Replit, store secrets via the Secrets manager (not in `.env`).

### Required secrets / env vars

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `SUPABASE_URL` | Same URL, used server-side |
| `SUPABASE_PUBLISHABLE_KEY` | Same key, used server-side |

The Lovable AI Gateway credential is handled by the `@lovable.dev/cloud-auth-js` package at runtime.

## Running locally

```bash
bun install
bun run dev
```

The dev server starts on port 3000 (configured by TanStack Start / Vite).

## User preferences

_None recorded yet._
