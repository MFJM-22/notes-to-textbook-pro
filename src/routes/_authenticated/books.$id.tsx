import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Sparkles, BookOpen, Plus, Trash2, Loader2, Download, Printer,
  ScanText, ListTree, Wand2, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { structureBook } from "@/lib/structure.functions";
import { generateGlossary } from "@/lib/glossary.functions";
import { exportBookDocx } from "@/lib/export.functions";
import {
  updateWeek, updateTopic, addTopic, deleteTopic,
  addWeek, deleteWeek, upsertGlossaryTerm, deleteGlossaryTerm,
} from "@/lib/content.functions";

export const Route = createFileRoute("/_authenticated/books/$id")({
  component: BookReview,
});

type Selection = { kind: "week"; id: string } | { kind: "glossary" } | { kind: "scans" };

function BookReview() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [selection, setSelection] = useState<Selection | null>(null);
  const [exportUrl, setExportUrl] = useState<string | null>(null);

  const bookQ = useQuery({
    queryKey: ["book", id],
    queryFn: async () => {
      const [{ data: book }, { data: weeks }, { data: topics }, { data: pages }, { data: glossary }] = await Promise.all([
        supabase.from("books").select("*").eq("id", id).maybeSingle(),
        supabase.from("weeks").select("*").eq("book_id", id).order("order_index"),
        supabase.from("topics").select("*").eq("book_id", id).order("order_index"),
        supabase.from("pages").select("id, page_order, ocr_text, ocr_status").eq("book_id", id).order("page_order"),
        supabase.from("glossary_terms").select("*").eq("book_id", id).order("term"),
      ]);
      return { book, weeks: weeks ?? [], topics: topics ?? [], pages: pages ?? [], glossary: glossary ?? [] };
    },
  });

  const structure = useServerFn(structureBook);
  const glossary = useServerFn(generateGlossary);
  const doExport = useServerFn(exportBookDocx);

  const structureMut = useMutation({
    mutationFn: () => structure({ data: { bookId: id } }),
    onSuccess: () => { toast.success("Textbook structured"); qc.invalidateQueries({ queryKey: ["book", id] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const glossaryMut = useMutation({
    mutationFn: () => glossary({ data: { bookId: id } }),
    onSuccess: () => { toast.success("Glossary generated"); qc.invalidateQueries({ queryKey: ["book", id] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const exportMut = useMutation({
    mutationFn: () => doExport({ data: { bookId: id } }),
    onSuccess: (res) => { setExportUrl(res.url); toast.success("Word file ready"); qc.invalidateQueries({ queryKey: ["book", id] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Export failed"),
  });

  useEffect(() => {
    if (!bookQ.data || selection) return;
    if (bookQ.data.weeks.length) setSelection({ kind: "week", id: bookQ.data.weeks[0].id });
    else setSelection({ kind: "scans" });
  }, [bookQ.data, selection]);

  if (bookQ.isLoading) return <div className="text-muted-foreground">Loading…</div>;
  if (!bookQ.data?.book) return <div>Book not found.</div>;

  const { book, weeks, topics, pages, glossary: terms } = bookQ.data;
  const activeWeek = selection?.kind === "week" ? weeks.find((w) => w.id === selection.id) : null;
  const activeTopics = activeWeek ? topics.filter((t) => t.week_id === activeWeek.id) : [];

  return (
    <div>
      <button
        onClick={() => navigate({ to: "/dashboard" })}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All books
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl">{book.title}</h1>
          <p className="mt-2 text-muted-foreground">{book.subject} · {book.class_level} · {book.term}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => structureMut.mutate()}
            disabled={structureMut.isPending || !pages.length}
            className="btn-primary btn-primary-hover"
            title={!pages.length ? "Upload pages first" : ""}
          >
            {structureMut.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
            {weeks.length ? "Re-structure with AI" : "Structure with AI"}
          </button>
          <button
            onClick={() => exportMut.mutate()}
            disabled={exportMut.isPending || !weeks.length}
            className="btn-outline"
          >
            {exportMut.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
            Export Word
          </button>
          <Link
            to="/books/$id/print"
            params={{ id }}
            target="_blank"
            className="btn-outline"
          >
            <Printer className="mr-1 h-4 w-4" /> Print / PDF
          </Link>
        </div>
      </div>

      {exportUrl && (
        <div className="book-card mt-4 flex items-center justify-between">
          <div className="text-sm">Your Word file is ready.</div>
          <div className="flex items-center gap-2">
            <a href={exportUrl} className="btn-primary btn-primary-hover" download>
              <Download className="mr-1 h-4 w-4" /> Download
            </a>
            <button onClick={() => setExportUrl(null)} className="rounded-lg p-2 hover:bg-secondary">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-[240px_1fr]">
        <aside className="space-y-4">
          <div className="book-card p-3">
            <div className="mb-2 flex items-center justify-between px-2 text-xs uppercase tracking-wide text-muted-foreground">
              <span>Weeks</span>
              <button
                onClick={async () => {
                  const { id: wid } = await (useServerFnWrap(addWeek))({ bookId: id });
                  qc.invalidateQueries({ queryKey: ["book", id] });
                  setSelection({ kind: "week", id: wid });
                }}
                className="rounded p-1 hover:bg-secondary"
                title="Add week"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            {weeks.length === 0 && (
              <p className="px-2 py-3 text-xs text-muted-foreground">Run "Structure with AI" to organize your notes.</p>
            )}
            <ul className="space-y-0.5">
              {weeks.map((w) => (
                <li key={w.id}>
                  <button
                    onClick={() => setSelection({ kind: "week", id: w.id })}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary ${selection?.kind === "week" && selection.id === w.id ? "bg-secondary font-medium" : ""}`}
                  >
                    <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">Week {w.week_number}: {w.title || "Untitled"}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="book-card p-3">
            <button
              onClick={() => setSelection({ kind: "glossary" })}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary ${selection?.kind === "glossary" ? "bg-secondary font-medium" : ""}`}
            >
              <ListTree className="h-4 w-4" /> Glossary ({terms.length})
            </button>
            <button
              onClick={() => setSelection({ kind: "scans" })}
              className={`mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary ${selection?.kind === "scans" ? "bg-secondary font-medium" : ""}`}
            >
              <ScanText className="h-4 w-4" /> Raw scans ({pages.length})
            </button>
          </div>
        </aside>

        <main>
          {selection?.kind === "week" && activeWeek && (
            <WeekView
              key={activeWeek.id}
              week={activeWeek}
              topics={activeTopics}
              onChange={() => qc.invalidateQueries({ queryKey: ["book", id] })}
              onDeleteWeek={() => setSelection({ kind: "scans" })}
            />
          )}
          {selection?.kind === "glossary" && (
            <GlossaryView
              bookId={id}
              terms={terms}
              onGenerate={() => glossaryMut.mutate()}
              generating={glossaryMut.isPending}
              onChange={() => qc.invalidateQueries({ queryKey: ["book", id] })}
            />
          )}
          {selection?.kind === "scans" && <ScansView pages={pages} />}
        </main>
      </div>
    </div>
  );
}

// Small helper so we can call server fns from event handlers imperatively.
function useServerFnWrap<T extends (arg: { data: unknown }) => Promise<unknown>>(fn: T) {
  const wrapped = useServerFn(fn as never) as unknown as (arg: { data: unknown }) => Promise<unknown>;
  return async (data: unknown) => (await wrapped({ data })) as never;
}

function WeekView({
  week, topics, onChange, onDeleteWeek,
}: {
  week: { id: string; week_number: number; title: string; overview: string };
  topics: Array<{ id: string; heading: string; body_markdown: string; objectives: string[]; activities: string[] }>;
  onChange: () => void;
  onDeleteWeek: () => void;
}) {
  const updWeek = useServerFn(updateWeek);
  const addT = useServerFn(addTopic);
  const delW = useServerFn(deleteWeek);
  const [title, setTitle] = useState(week.title);
  const [overview, setOverview] = useState(week.overview);
  useEffect(() => { setTitle(week.title); setOverview(week.overview); }, [week.id]);

  const saveWeek = async () => {
    try {
      await updWeek({ data: { id: week.id, title, overview } });
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="book-card space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Week {week.week_number}</div>
          <button
            onClick={async () => {
              if (!confirm("Delete this entire week?")) return;
              await delW({ data: { id: week.id } });
              onDeleteWeek();
              onChange();
            }}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
            title="Delete week"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveWeek}
          placeholder="Week title"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-lg font-semibold outline-none focus:ring-2 focus:ring-ring"
        />
        <textarea
          value={overview}
          onChange={(e) => setOverview(e.target.value)}
          onBlur={saveWeek}
          placeholder="Week overview — one paragraph the student reads before the lessons."
          rows={3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {topics.map((t) => (
        <TopicCard key={t.id} topic={t} onChange={onChange} />
      ))}

      <button
        onClick={async () => { await addT({ data: { weekId: week.id } }); onChange(); }}
        className="btn-outline w-full"
      >
        <Plus className="mr-1 h-4 w-4" /> Add topic
      </button>
    </div>
  );
}

function TopicCard({
  topic, onChange,
}: {
  topic: { id: string; heading: string; body_markdown: string; objectives: string[]; activities: string[] };
  onChange: () => void;
}) {
  const upd = useServerFn(updateTopic);
  const del = useServerFn(deleteTopic);
  const [state, setState] = useState({
    heading: topic.heading,
    body_markdown: topic.body_markdown,
    objectives: topic.objectives.join("\n"),
    activities: topic.activities.join("\n"),
  });

  const save = async () => {
    try {
      await upd({ data: {
        id: topic.id,
        heading: state.heading,
        body_markdown: state.body_markdown,
        objectives: state.objectives.split("\n").map((s) => s.trim()).filter(Boolean),
        activities: state.activities.split("\n").map((s) => s.trim()).filter(Boolean),
      } });
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  return (
    <div className="book-card space-y-4">
      <div className="flex items-start justify-between gap-2">
        <input
          value={state.heading}
          onChange={(e) => setState({ ...state, heading: e.target.value })}
          onBlur={save}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 font-semibold outline-none focus:ring-2 focus:ring-ring"
          placeholder="Topic heading"
        />
        <button
          onClick={async () => { if (!confirm("Delete this topic?")) return; await del({ data: { id: topic.id } }); onChange(); }}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
          title="Delete topic"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div>
        <label className="text-xs uppercase tracking-wide text-muted-foreground">Body</label>
        <textarea
          value={state.body_markdown}
          onChange={(e) => setState({ ...state, body_markdown: e.target.value })}
          onBlur={save}
          rows={10}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          placeholder="The main lesson text. Plain paragraphs separated by blank lines."
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs uppercase tracking-wide text-muted-foreground">Objectives (one per line)</label>
          <textarea
            value={state.objectives}
            onChange={(e) => setState({ ...state, objectives: e.target.value })}
            onBlur={save}
            rows={4}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-muted-foreground">Activities (one per line)</label>
          <textarea
            value={state.activities}
            onChange={(e) => setState({ ...state, activities: e.target.value })}
            onBlur={save}
            rows={4}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
    </div>
  );
}

function GlossaryView({
  bookId, terms, onGenerate, generating, onChange,
}: {
  bookId: string;
  terms: Array<{ id: string; term: string; definition: string }>;
  onGenerate: () => void;
  generating: boolean;
  onChange: () => void;
}) {
  const upsert = useServerFn(upsertGlossaryTerm);
  const del = useServerFn(deleteGlossaryTerm);
  const [newTerm, setNewTerm] = useState("");
  const [newDef, setNewDef] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">Glossary</h2>
        <button onClick={onGenerate} disabled={generating} className="btn-primary btn-primary-hover">
          {generating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1 h-4 w-4" />}
          Generate with AI
        </button>
      </div>

      <div className="book-card space-y-2">
        <div className="grid gap-2 sm:grid-cols-[200px_1fr_auto]">
          <input
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            placeholder="New term"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            value={newDef}
            onChange={(e) => setNewDef(e.target.value)}
            placeholder="Definition"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={async () => {
              if (!newTerm.trim()) return;
              await upsert({ data: { bookId, term: newTerm.trim(), definition: newDef.trim() } });
              setNewTerm(""); setNewDef(""); onChange();
            }}
            className="btn-outline"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {terms.length === 0 ? (
        <div className="book-card text-center text-muted-foreground">
          No terms yet. Structure your book first, then generate the glossary with AI.
        </div>
      ) : (
        <ul className="space-y-2">
          {terms.map((t) => (
            <GlossaryRow key={t.id} row={t} onChange={onChange} onDelete={async () => { await del({ data: { id: t.id } }); onChange(); }} bookId={bookId} />
          ))}
        </ul>
      )}
    </div>
  );
}

function GlossaryRow({
  row, bookId, onChange, onDelete,
}: {
  row: { id: string; term: string; definition: string };
  bookId: string;
  onChange: () => void;
  onDelete: () => void;
}) {
  const upsert = useServerFn(upsertGlossaryTerm);
  const [term, setTerm] = useState(row.term);
  const [def, setDef] = useState(row.definition);
  const save = async () => {
    await upsert({ data: { id: row.id, bookId, term, definition: def } });
    onChange();
  };
  return (
    <li className="book-card grid items-center gap-2 sm:grid-cols-[200px_1fr_auto]">
      <input value={term} onChange={(e) => setTerm(e.target.value)} onBlur={save}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring" />
      <input value={def} onChange={(e) => setDef(e.target.value)} onBlur={save}
        className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
      <button onClick={onDelete} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive">
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function ScansView({ pages }: { pages: Array<{ id: string; page_order: number; ocr_text: string | null; ocr_status: string }> }) {
  return (
    <div>
      <h2 className="text-2xl">Scanned pages</h2>
      <p className="mt-1 text-sm text-muted-foreground">Raw OCR output from your uploaded pages. Read-only reference.</p>
      <div className="mt-4 space-y-4">
        {pages.length === 0 && <div className="book-card text-center text-muted-foreground">No pages uploaded.</div>}
        {pages.map((p, i) => (
          <div key={p.id} className="book-card">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Page {i + 1}</div>
              <div className="text-xs text-muted-foreground">{p.ocr_status}</div>
            </div>
            <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-4 font-sans text-sm">
              {p.ocr_text || "(no text extracted yet)"}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
