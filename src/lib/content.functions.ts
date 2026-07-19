import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Update a week's editable fields
export const updateWeek = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      title: z.string().max(200).optional(),
      overview: z.string().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("weeks").update(patch).eq("id", id);
    if (error) throw error;
    return { ok: true };
  });

export const updateTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      heading: z.string().max(200).optional(),
      body_markdown: z.string().optional(),
      objectives: z.array(z.string()).optional(),
      activities: z.array(z.string()).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("topics").update(patch).eq("id", id);
    if (error) throw error;
    return { ok: true };
  });

export const addTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ weekId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: week } = await context.supabase
      .from("weeks").select("id, book_id").eq("id", data.weekId).single();
    if (!week) throw new Error("Week not found");
    const { count } = await context.supabase
      .from("topics").select("id", { count: "exact", head: true }).eq("week_id", week.id);
    const { data: row, error } = await context.supabase.from("topics").insert({
      week_id: week.id,
      book_id: week.book_id,
      author_id: context.userId,
      heading: "New topic",
      body_markdown: "",
      objectives: [],
      activities: [],
      order_index: count ?? 0,
    }).select("id").single();
    if (error) throw error;
    return { id: row.id };
  });

export const deleteTopic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("topics").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const addWeek = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ bookId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { count } = await context.supabase
      .from("weeks").select("id", { count: "exact", head: true }).eq("book_id", data.bookId);
    const n = (count ?? 0) + 1;
    const { data: row, error } = await context.supabase.from("weeks").insert({
      book_id: data.bookId,
      author_id: context.userId,
      week_number: n,
      title: `Week ${n}`,
      overview: "",
      order_index: n - 1,
    }).select("id").single();
    if (error) throw error;
    return { id: row.id };
  });

export const deleteWeek = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("weeks").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const upsertGlossaryTerm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      bookId: z.string().uuid(),
      term: z.string().min(1).max(200),
      definition: z.string(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { error } = await context.supabase.from("glossary_terms")
        .update({ term: data.term, definition: data.definition }).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase.from("glossary_terms").insert({
      book_id: data.bookId,
      author_id: context.userId,
      term: data.term,
      definition: data.definition,
    }).select("id").single();
    if (error) throw error;
    return { id: row.id };
  });

export const deleteGlossaryTerm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("glossary_terms").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
