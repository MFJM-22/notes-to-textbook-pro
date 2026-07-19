## Slice 2 — From OCR pages to a publication-ready textbook

Build on Slice 1 so a teacher can turn their scanned pages into structured weeks/topics, review and edit everything, auto-build a glossary, and export a Word document (with a print-ready PDF path).

### 1. Database (one migration)

Add two tables plus a status bump:

- `weeks` — one row per week in a book: `book_id`, `week_number`, `title`, `overview`, `order_index`.
- `topics` — content blocks inside a week: `week_id`, `book_id`, `heading`, `body_markdown`, `objectives` (text[]), `activities` (text[]), `order_index`.
- `glossary_terms` — `book_id`, `term`, `definition`, `source_week_id` (nullable).
- Extend `books.status` values used by the UI: `awaiting_structuring`, `structured`, `generated`.

Each new table gets: GRANT to authenticated + service_role, RLS on, and an `author_id = auth.uid()` policy (denormalize `author_id` on each table for simple RLS, matching how `pages` works).

### 2. AI structuring (server function)

`src/lib/structure.functions.ts` → `structureBook({ bookId })`:

1. Auth via `requireSupabaseAuth`, verify book ownership.
2. Load all pages for the book in `page_order`, concatenate OCR text with page markers.
3. Call Lovable AI Gateway (`google/gemini-3.5-flash`) with a strict JSON schema prompt:
   - Nigerian JSS curriculum framing (subject, class, term already on the book row).
   - Output: `{ weeks: [{ week_number, title, overview, topics: [{ heading, body_markdown, objectives[], activities[] }] }] }`.
   - 10–13 weeks per term, each with 1–3 topics.
4. Wipe existing `weeks`/`topics` for that book (idempotent re-run), insert the new tree, bump `books.status = 'structured'`.

`src/lib/glossary.functions.ts` → `generateGlossary({ bookId })`:

1. Pull all topic bodies, ask Gemini for 15–40 key terms with kid-friendly definitions in JSON.
2. Replace `glossary_terms` rows for the book.

Both use `Output.object` (structured output) via the gateway with a guarded fallback (empty result on `NoObjectGeneratedError`).

### 3. Review board UI (`/books/$id`)

Replace the current OCR-only view with a two-pane review workspace:

- Left rail: week list (add/reorder/rename), plus "Glossary" and "Raw scans" entries.
- Main pane per week:
  - Editable week title + overview.
  - Topic cards with inline editing (heading, markdown body, objectives, activities).
  - Add/delete/reorder topics.
- "Structure with AI" button when status is `awaiting_structuring` (or to re-run).
- "Generate glossary" button on the Glossary view.
- All edits go through small `createServerFn` mutations (`updateWeek`, `updateTopic`, `reorderTopics`, `upsertGlossaryTerm`, `deleteTopic`, etc.), invalidating the book query on success.
- Keep a "Raw scans" tab that shows the existing per-page OCR (read-only) so the teacher can cross-check.

### 4. Export

`src/lib/export.functions.ts` → `exportBookDocx({ bookId })`:

- Uses the `docx` npm package (server-side) to build the Word file:
  - Cover page (title, author full name + credentials from `authors`, subject/class/term).
  - Table of contents (weeks).
  - Per week: heading, overview, then each topic (heading, body paragraphs from markdown, "Objectives" bullet list, "Activities" bullet list).
  - Glossary at the end (alphabetized).
- Upload the generated `.docx` into a new public-read `exports` storage bucket at `books/{bookId}/textbook.docx` and return a signed URL. Bump `books.status = 'generated'`.
- On the book page, an "Export" panel shows: Download Word, plus a "Print to PDF" button that opens a print-optimized route (`/books/$id/print`) styled for A4 — teacher uses browser Print → Save as PDF. This keeps the slice out of native PDF-rendering land while still giving a shareable PDF.

### 5. Small polish

- Dashboard status pill: add `awaiting_structuring` and `structured` labels/colors.
- After the New Book wizard finishes uploading + OCR, set `books.status = 'awaiting_structuring'` and route to the new review board.

### Technical notes

- Server functions live in client-safe paths (`src/lib/*.functions.ts`) and use `requireSupabaseAuth`; called via `useServerFn` from components.
- Gemini structured output uses `Output.object` with strict Zod schemas; limits (week count, term count) stated in the prompt and clamped after parsing.
- `docx` runs inside the Worker runtime — pure JS, no native deps, safe here.
- New `exports` bucket: public read (so signed URLs aren't needed for share), authenticated write via RLS scoped to `author_id`.
- No changes to auto-generated files or existing Slice 1 code beyond the review-board replacement of `books.$id.tsx` and status labels.

### Out of scope (future slices)

- Real PDF rendering server-side (Puppeteer/etc. — not Worker-friendly).
- Cover image generation, illustrations.
- Collaboration / multi-author editing.
- Publishing/marketplace.
