import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({ bookId: z.string().uuid() });

type ChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

const StructureSchema = z.object({
  weeks: z.array(
    z.object({
      week_number: z.number().int().min(1).max(15),
      title: z.string(),
      overview: z.string(),
      topics: z.array(
        z.object({
          heading: z.string(),
          body_markdown: z.string(),
          objectives: z.array(z.string()).default([]),
          activities: z.array(z.string()).default([]),
        }),
      ),
    }),
  ),
});

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("AI returned non-JSON output");
  }
}

export const structureBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const { data: book, error: bookErr } = await supabase
      .from("books").select("*").eq("id", data.bookId).eq("author_id", userId).single();
    if (bookErr || !book) throw new Error("Book not found");

    const { data: pages } = await supabase
      .from("pages").select("page_order, ocr_text").eq("book_id", book.id).order("page_order");

    const notes = (pages ?? [])
      .map((p, i) => `--- Page ${i + 1} ---\n${p.ocr_text ?? ""}`)
      .join("\n\n")
      .slice(0, 60000);

    if (!notes.trim()) throw new Error("No OCR text found for this book yet.");

    const system = `You are an expert Nigerian JSS curriculum editor. Take a teacher's raw scanned lesson notes and organize them into a coherent term textbook for ${book.class_level} ${book.subject}, ${book.term}. Produce 10–13 weeks. Each week has 1–3 topics. Each topic has a heading, well-written body (2–5 paragraphs of markdown suitable for a printed textbook, expand the notes into full sentences, keep facts from the notes), 2–4 objectives (starts with a verb), and 2–4 activities. Output ONLY valid JSON, no prose, no code fences. Shape: {"weeks":[{"week_number":1,"title":"...","overview":"...","topics":[{"heading":"...","body_markdown":"...","objectives":["..."],"activities":["..."]}]}]}`;

    const user = `Book title: ${book.title}\n\nTeacher's raw notes (from OCR of scanned pages):\n\n${notes}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`AI structuring failed [${res.status}]: ${body}`);
    }

    const json = (await res.json()) as ChatResponse;
    const raw = json.choices?.[0]?.message?.content ?? "";
    const parsed = StructureSchema.parse(extractJson(raw));

    // Wipe existing structure (topics cascade)
    await supabase.from("weeks").delete().eq("book_id", book.id);

    // Insert weeks + topics
    for (const [wi, w] of parsed.weeks.slice(0, 13).entries()) {
      const { data: weekRow, error: wErr } = await supabase
        .from("weeks")
        .insert({
          book_id: book.id,
          author_id: userId,
          week_number: w.week_number || wi + 1,
          title: w.title.slice(0, 200),
          overview: w.overview,
          order_index: wi,
        })
        .select("id")
        .single();
      if (wErr || !weekRow) throw wErr ?? new Error("Failed to insert week");

      const topicRows = w.topics.slice(0, 5).map((t, ti) => ({
        week_id: weekRow.id,
        book_id: book.id,
        author_id: userId,
        heading: t.heading.slice(0, 200),
        body_markdown: t.body_markdown,
        objectives: t.objectives.slice(0, 6),
        activities: t.activities.slice(0, 6),
        order_index: ti,
      }));
      if (topicRows.length) {
        const { error: tErr } = await supabase.from("topics").insert(topicRows);
        if (tErr) throw tErr;
      }
    }

    await supabase.from("books").update({ status: "structured" }).eq("id", book.id);
    return { ok: true, weekCount: parsed.weeks.length };
  });
