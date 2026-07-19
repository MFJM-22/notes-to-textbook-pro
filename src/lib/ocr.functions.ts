import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RunOcrInput = z.object({ pageId: z.string().uuid() });

type ChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

export const runOcrOnPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RunOcrInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    // 1. Load page row (RLS ensures ownership)
    const { data: page, error: pageErr } = await supabase
      .from("pages").select("id, storage_path, book_id, mime_type").eq("id", data.pageId).single();
    if (pageErr || !page) throw new Error("Page not found");

    // 2. Download image bytes
    const { data: blob, error: dlErr } = await supabase.storage.from("scans").download(page.storage_path);
    if (dlErr || !blob) throw new Error("Could not read scan");
    const buf = await blob.arrayBuffer();
    const b64 = Buffer.from(buf).toString("base64");
    const mime = page.mime_type || blob.type || "image/jpeg";

    // 3. Mark processing
    await supabase.from("pages").update({ ocr_status: "processing" }).eq("id", page.id);

    // 4. Call Lovable AI Gateway (Gemini vision) for OCR
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
        },
        body: JSON.stringify({
          model: "google/gemini-3.5-flash",
          messages: [
            {
              role: "system",
              content:
                "You are an OCR engine for scanned lesson notes (English, may include handwriting). Transcribe the page exactly as written. Preserve line breaks, headings, numbered lists, and mathematical notation. Do not summarize, translate, or add commentary. Output only the transcribed text.",
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Transcribe every word on this page verbatim." },
                { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
              ],
            },
          ],
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        await supabase.from("pages").update({ ocr_status: "failed", ocr_text: `OCR failed: ${res.status}` }).eq("id", page.id);
        throw new Error(`Gemini OCR failed [${res.status}]: ${body}`);
      }

      const json = (await res.json()) as ChatResponse;
      const text = json.choices?.[0]?.message?.content?.trim() ?? "";

      await supabase.from("pages").update({
        ocr_status: "done",
        ocr_text: text,
        ocr_confidence: text.length > 20 ? 0.9 : 0.4,
      }).eq("id", page.id).eq("author_id", userId);

      return { ok: true, textLength: text.length };
    } catch (e) {
      await supabase.from("pages").update({ ocr_status: "failed" }).eq("id", page.id);
      throw e;
    }
  });
