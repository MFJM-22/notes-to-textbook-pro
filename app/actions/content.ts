"use server";

import { getAuthenticatedClient } from "./auth";

export async function updateWeek(
  token: string,
  data: { id: string; title?: string; overview?: string }
) {
  const { supabase } = await getAuthenticatedClient(token);
  const { id, ...patch } = data;
  const { error } = await supabase.from("weeks").update(patch).eq("id", id);
  if (error) throw error;
  return { ok: true };
}

export async function updateTopic(
  token: string,
  data: {
    id: string;
    heading?: string;
    body_markdown?: string;
    objectives?: string[];
    activities?: string[];
  }
) {
  const { supabase } = await getAuthenticatedClient(token);
  const { id, ...patch } = data;
  const { error } = await supabase.from("topics").update(patch).eq("id", id);
  if (error) throw error;
  return { ok: true };
}

export async function addTopic(token: string, data: { weekId: string }) {
  const { supabase, userId } = await getAuthenticatedClient(token);
  const { data: week } = await supabase
    .from("weeks")
    .select("id, book_id")
    .eq("id", data.weekId)
    .single();
  if (!week) throw new Error("Week not found");

  const { count } = await supabase
    .from("topics")
    .select("id", { count: "exact", head: true })
    .eq("week_id", week.id);

  const { data: row, error } = await supabase
    .from("topics")
    .insert({
      week_id: week.id,
      book_id: week.book_id,
      author_id: userId,
      heading: "New topic",
      body_markdown: "",
      objectives: [],
      activities: [],
      order_index: count ?? 0,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: row.id };
}

export async function deleteTopic(token: string, data: { id: string }) {
  const { supabase } = await getAuthenticatedClient(token);
  const { error } = await supabase.from("topics").delete().eq("id", data.id);
  if (error) throw error;
  return { ok: true };
}

export async function addWeek(token: string, data: { bookId: string }) {
  const { supabase, userId } = await getAuthenticatedClient(token);
  const { count } = await supabase
    .from("weeks")
    .select("id", { count: "exact", head: true })
    .eq("book_id", data.bookId);

  const n = (count ?? 0) + 1;
  const { data: row, error } = await supabase
    .from("weeks")
    .insert({
      book_id: data.bookId,
      author_id: userId,
      week_number: n,
      title: `Week ${n}`,
      overview: "",
      order_index: n - 1,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: row.id };
}

export async function deleteWeek(token: string, data: { id: string }) {
  const { supabase } = await getAuthenticatedClient(token);
  const { error } = await supabase.from("weeks").delete().eq("id", data.id);
  if (error) throw error;
  return { ok: true };
}

export async function upsertGlossaryTerm(
  token: string,
  data: {
    id?: string;
    bookId: string;
    term: string;
    definition: string;
  }
) {
  const { supabase, userId } = await getAuthenticatedClient(token);
  if (data.id) {
    const { error } = await supabase
      .from("glossary_terms")
      .update({ term: data.term, definition: data.definition })
      .eq("id", data.id);
    if (error) throw error;
    return { id: data.id };
  }

  const { data: row, error } = await supabase
    .from("glossary_terms")
    .insert({
      book_id: data.bookId,
      author_id: userId,
      term: data.term,
      definition: data.definition,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: row.id };
}

export async function deleteGlossaryTerm(token: string, data: { id: string }) {
  const { supabase } = await getAuthenticatedClient(token);
  const { error } = await supabase.from("glossary_terms").delete().eq("id", data.id);
  if (error) throw error;
  return { ok: true };
}
