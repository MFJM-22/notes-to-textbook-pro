# Textbook Studio

A web app for JSS1 & JSS2 teachers in Nigeria that turns scanned handwritten lesson notes into publication-ready textbooks weeks, topics, glossary, and a Word export ready to print or send to a publisher.

## Features

- **Scan & OCR** — upload photos of handwritten notes; Gemini vision extracts the text
- **AI structuring** — organises content into Weeks → Topics following the Nigerian JSS curriculum (subject, class, term)
- **Review board** — editable week/topic tree with inline editing, reordering, and deletion
- **Glossary generation** — 15–40 key terms with age-appropriate definitions
- **Word export** — `.docx` with cover page, table of contents, weeks, and glossary; browser print-to-PDF for a shareable PDF

## Tech stack

| Layer | Technology |
|---|---|
| Framework | TanStack Start (SSR) + React 19 |
| Styling | Tailwind CSS v4 + Radix UI (shadcn/ui) |
| Database & Auth | Supabase (PostgreSQL, Row-Level Security, Storage) |
| AI | Google Gemini API (`gemini-2.0-flash` for OCR, `gemini-2.5-flash` for structuring & glossary) |
| Export | `docx` npm package (server-side Word generation) |
| Package manager | `bun` |

## Project structure

```
src/
  routes/
    index.tsx                     # Landing page
    auth.tsx                      # Sign-in / sign-up
    _authenticated/
      dashboard.tsx               # Book list
      books.new.tsx               # New book wizard
      books.$id.tsx               # Review board (weeks, topics, glossary)
      books.$id.print.tsx         # Print-optimised route for PDF
      profile.tsx
  lib/
    ocr.functions.ts              # Gemini vision OCR (server function)
    structure.functions.ts        # AI curriculum structuring (server function)
    glossary.functions.ts         # AI glossary generation (server function)
    export.functions.ts           # Word export (server function)
    error-reporting.ts            # Runtime error forwarding (dev-only)
  integrations/
    supabase/                     # Supabase client, auth middleware, types
    oauth/                        # Google OAuth wrapper (Supabase signInWithOAuth)
supabase/
  migrations/                     # Database schema
```

## Setup

### Prerequisites

- [Bun](https://bun.sh) installed
- A [Supabase](https://supabase.com) project
- A [Google Gemini API key](https://aistudio.google.com)

### Environment variables

Set the following as environment secrets (never hardcode them):

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_URL` | Same value — needed for Vite client-side injection |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Same value — needed for Vite client-side injection |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only, bypasses RLS) |
| `GEMINI_API_KEY` | Google Gemini API key |

### Google OAuth (optional)

To enable "Continue with Google" sign-in:

1. Supabase dashboard → Authentication → Providers → Google — enable it and note the redirect URL
2. [Google Cloud Console](https://console.cloud.google.com) → OAuth 2.0 credentials → add the Supabase redirect URL as an authorised redirect URI
3. Paste the Google Client ID and Secret back into the Supabase Google provider settings

### Running locally

```bash
bun install
bun run dev        # starts on http://localhost:5000
```

### Running on Replit

The "Start application" workflow runs `bun run dev` on port 5000. Make sure all secrets above are set in the Replit Secrets manager before starting.

### Database migrations

```bash
supabase db push   # applies migrations in supabase/migrations/ to your project
```
