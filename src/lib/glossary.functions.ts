import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({ bookId: z.string().uuid() });

type ChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

const GlossarySchema = z.object({
  terms: z.array(
    z.object({
      term: z.string(),
      definition: z.string(),
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

export const generateGlossary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const { data: book } = await supabase
      .from("books").select("*").eq("id", data.bookId).eq("author_id", userId).single();
    if (!book) throw new Error("Book not found");

    const { data: topics } = await supabase
      .from("topics").select("heading, body_markdown").eq("book_id", book.id);

    const corpus = (topics ?? [])
      .map((t) => `## ${t.heading}\n${t.body_markdown}`)
      .join("\n\n")
      .slice(0, 40000);

    if (!corpus.trim()) throw new Error("Structure the book first before generating a glossary.");

    const system = `You are a textbook glossary editor for Nigerian junior secondary students. Extract 15–30 important terms from the given textbook content. Definitions must be clear, one or two sentences, age-appropriate for JSS students. Output ONLY valid JSON, no prose, no code fences. Shape: {"terms":[{"term":"...","definition":"..."}]}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Subject: ${book.subject}\nClass: ${book.class_level}\n\nContent:\n${corpus}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Glossary generation failed [${res.status}]: ${body}`);
    }

    const json = (await res.json()) as ChatResponse;
    const raw = json.choices?.[0]?.message?.content ?? "";
    const parsed = GlossarySchema.parse(extractJson(raw));

    await supabase.from("glossary_terms").delete().eq("book_id", book.id);

    const rows = parsed.terms.slice(0, 40).map((t) => ({
      book_id: book.id,
      author_id: userId,
      term: t.term.slice(0, 200),
      definition: t.definition,
    }));
    if (rows.length) {
      const { error } = await supabase.from("glossary_terms").insert(rows);
      if (error) throw error;
    }

    return { ok: true, count: rows.length };
  });
