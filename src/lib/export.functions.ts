import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  PageBreak, LevelFormat,
} from "docx";

const Input = z.object({ bookId: z.string().uuid() });

function mdParagraphs(text: string): Paragraph[] {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return blocks.map(
    (b) => new Paragraph({
      children: [new TextRun({ text: b.replace(/\s+/g, " "), size: 22 })],
      spacing: { after: 160 },
    }),
  );
}

export const exportBookDocx = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: book } = await supabase
      .from("books").select("*").eq("id", data.bookId).eq("author_id", userId).single();
    if (!book) throw new Error("Book not found");

    const { data: author } = await supabase
      .from("authors").select("full_name, credentials, bio").eq("id", userId).single();

    const { data: weeks } = await supabase
      .from("weeks").select("*").eq("book_id", book.id).order("order_index");

    const { data: topics } = await supabase
      .from("topics").select("*").eq("book_id", book.id).order("order_index");

    const { data: glossary } = await supabase
      .from("glossary_terms").select("*").eq("book_id", book.id).order("term");

    const children: Paragraph[] = [];

    // Cover
    children.push(
      new Paragraph({
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { before: 3000, after: 400 },
        children: [new TextRun({ text: book.title, bold: true, size: 56 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: `${book.subject} · ${book.class_level} · ${book.term}`, size: 28 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 1200 },
        children: [new TextRun({ text: author?.full_name || "", size: 26, bold: true })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: author?.credentials || "", size: 22, italics: true })],
      }),
      new Paragraph({ children: [new PageBreak()] }),
    );

    // TOC
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: "Table of Contents", bold: true })],
      }),
      new Paragraph({
        children: [new TableOfContents("Contents", { hyperlink: true, headingStyleRange: "1-2" }) as unknown as TextRun],
      }),
      new Paragraph({ children: [new PageBreak()] }),
    );

    // Weeks
    for (const w of weeks ?? []) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 320, after: 120 },
          children: [new TextRun({ text: `Week ${w.week_number}: ${w.title}`, bold: true })],
        }),
      );
      if (w.overview) {
        children.push(
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: w.overview, italics: true, size: 22 })],
          }),
        );
      }
      const weekTopics = (topics ?? []).filter((t) => t.week_id === w.id);
      for (const t of weekTopics) {
        children.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
            children: [new TextRun({ text: t.heading, bold: true })],
          }),
          ...mdParagraphs(t.body_markdown || ""),
        );
        if (t.objectives?.length) {
          children.push(new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [new TextRun({ text: "Learning objectives", bold: true, size: 22 })],
          }));
          for (const o of t.objectives) {
            children.push(new Paragraph({
              numbering: { reference: "bullets", level: 0 },
              children: [new TextRun({ text: o, size: 22 })],
            }));
          }
        }
        if (t.activities?.length) {
          children.push(new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [new TextRun({ text: "Activities", bold: true, size: 22 })],
          }));
          for (const a of t.activities) {
            children.push(new Paragraph({
              numbering: { reference: "numbers", level: 0 },
              children: [new TextRun({ text: a, size: 22 })],
            }));
          }
        }
      }
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    // Glossary
    if ((glossary ?? []).length) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 200 },
        children: [new TextRun({ text: "Glossary", bold: true })],
      }));
      for (const g of glossary!) {
        children.push(
          new Paragraph({
            spacing: { before: 120 },
            children: [
              new TextRun({ text: `${g.term} — `, bold: true, size: 22 }),
              new TextRun({ text: g.definition, size: 22 }),
            ],
          }),
        );
      }
    }

    const doc = new Document({
      creator: author?.full_name || "Textbook Studio",
      title: book.title,
      styles: {
        default: { document: { run: { font: "Georgia", size: 22 } } },
        paragraphStyles: [
          { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
            run: { size: 36, bold: true, font: "Georgia" },
            paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 } },
          { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
            run: { size: 28, bold: true, font: "Georgia" },
            paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
        ],
      },
      numbering: {
        config: [
          { reference: "bullets", levels: [{
            level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          }] },
          { reference: "numbers", levels: [{
            level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } },
          }] },
        ],
      },
      sections: [{
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children,
      }],
    });

    const buf = await Packer.toBuffer(doc);
    const path = `${userId}/${book.id}/textbook.docx`;
    const { error: upErr } = await supabase.storage.from("exports").upload(
      path,
      buf,
      { contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", upsert: true },
    );
    if (upErr) throw upErr;

    const { data: signed, error: sErr } = await supabase.storage.from("exports")
      .createSignedUrl(path, 60 * 60);
    if (sErr || !signed) throw sErr ?? new Error("Failed to sign URL");

    await supabase.from("books").update({ status: "generated" }).eq("id", book.id);

    return { url: signed.signedUrl, path };
  });
