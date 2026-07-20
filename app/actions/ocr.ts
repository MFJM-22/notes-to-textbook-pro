"use server";

import { getAuthenticatedClient } from "./auth";

export async function runOcrOnPage(token: string, data: { pageId: string }) {
  const { supabase, userId } = await getAuthenticatedClient(token);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");

  // 1. Load page row (RLS ensures ownership)
  const { data: page, error: pageErr } = await supabase
    .from("pages")
    .select("id, storage_path, book_id, mime_type")
    .eq("id", data.pageId)
    .single();
  if (pageErr || !page) throw new Error("Page not found");

  // 2. Download image bytes
  const { data: blob, error: dlErr } = await supabase.storage.from("scans").download(page.storage_path);
  if (dlErr || !blob) throw new Error("Could not read scan");
  const buf = await blob.arrayBuffer();
  const b64 = Buffer.from(buf).toString("base64");
  const mime = page.mime_type || blob.type || "image/jpeg";

  // 3. Mark processing
  await supabase.from("pages").update({ ocr_status: "processing" }).eq("id", page.id);

  // 4. Call Gemini vision API directly for OCR
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "You are an OCR engine for scanned lesson notes (English, may include handwriting). Transcribe the page exactly as written. Preserve line breaks, headings, numbered lists, and mathematical notation. Do not summarize, translate, or add commentary. Output only the transcribed text.\n\nTranscribe every word on this page verbatim.",
                },
                { inlineData: { mimeType: mime, data: b64 } },
              ],
            },
          ],
          generationConfig: { temperature: 0 },
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      await supabase
        .from("pages")
        .update({ ocr_status: "failed", ocr_text: `OCR failed: ${res.status}` })
        .eq("id", page.id);
      throw new Error(`Gemini OCR failed [${res.status}]: ${body}`);
    }

    const json = await res.json() as any;
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    await supabase
      .from("pages")
      .update({
        ocr_status: "done",
        ocr_text: text,
        ocr_confidence: text.length > 20 ? 0.9 : 0.4,
      })
      .eq("id", page.id)
      .eq("author_id", userId);

    return { ok: true, textLength: text.length };
  } catch (e) {
    await supabase.from("pages").update({ ocr_status: "failed" }).eq("id", page.id);
    throw e;
  }
}
