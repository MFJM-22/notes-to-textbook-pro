"use server";

import { getAuthenticatedClient } from "./auth";
import { z } from "zod";

const GlossarySchema = z.object({
  terms: z.array(
    z.object({
      term: z.string(),
      definition: z.string(),
    })
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

export async function generateGlossary(token: string, data: { bookId: string }) {
  const { supabase, userId } = await getAuthenticatedClient(token);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");

  const { data: book } = await supabase
    .from("books")
    .select("*")
    .eq("id", data.bookId)
    .eq("author_id", userId)
    .single();
  if (!book) throw new Error("Book not found");

  const { data: topics } = await supabase
    .from("topics")
    .select("heading, body_markdown")
    .eq("book_id", book.id);

  const corpus = (topics ?? [])
    .map((t) => `## ${t.heading}\n${t.body_markdown}`)
    .join("\n\n")
    .slice(0, 40000);

  if (!corpus.trim()) throw new Error("Structure the book first before generating a glossary.");

  const prompt = `You are a textbook glossary editor for Nigerian junior secondary students. Extract 15–30 important terms from the given textbook content. Definitions must be clear, one or two sentences, age-appropriate for JSS students. Output ONLY valid JSON, no prose, no code fences. Shape: {"terms":[{"term":"...","definition":"..."}]}

Subject: ${book.subject}
Class: ${book.class_level}

Content:
${corpus}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Glossary generation failed [${res.status}]: ${body}`);
  }

  const json = await res.json() as any;
  const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
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
}
