"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Sparkles, BookOpen, Plus, Trash2, Loader2, Download, Printer,
  ScanText, ListTree, Wand2, X, Upload, FileImage, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { runOcrOnPage } from "@/app/actions/ocr";
import { structureBook } from "@/app/actions/structure";
import { generateGlossary } from "@/app/actions/glossary";
import { exportBookDocx } from "@/app/actions/export";
import {
  updateWeek, updateTopic, addTopic, deleteTopic,
  addWeek, deleteWeek, upsertGlossaryTerm, deleteGlossaryTerm,
} from "@/app/actions/content";

type Selection = { kind: "week"; id: string } | { kind: "glossary" } | { kind: "scans" };

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Session expired. Please sign in again.");
  return token;
}

export default function BookReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [exportUrl, setExportUrl] = useState<string | null>(null);

  const bookQ = useQuery({
    queryKey: ["book", id],
    queryFn: async () => {
      const [{ data: book }, { data: weeks }, { data: topics }, { data: pages }, { data: glossary }] =
        await Promise.all([
          supabase.from("books").select("*").eq("id", id).maybeSingle(),
          supabase.from("weeks").select("*").eq("book_id", id).order("order_index"),
          supabase.from("topics").select("*").eq("book_id", id).order("order_index"),
          supabase.from("pages").select("id, page_order, ocr_text, ocr_status").eq("book_id", id).order("page_order"),
          supabase.from("glossary_terms").select("*").eq("book_id", id).order("term"),
        ]);
      return { book, weeks: weeks ?? [], topics: topics ?? [], pages: pages ?? [], glossary: glossary ?? [] };
    },
  });

  const structureMut = useMutation({
    mutationFn: async () => { const t = await getToken(); return structureBook(t, { bookId: id }); },
    onSuccess: () => { toast.success("Textbook structured"); qc.invalidateQueries({ queryKey: ["book", id] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const glossaryMut = useMutation({
    mutationFn: async () => { const t = await getToken(); return generateGlossary(t, { bookId: id }); },
    onSuccess: () => { toast.success("Glossary generated"); qc.invalidateQueries({ queryKey: ["book", id] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const exportMut = useMutation({
    mutationFn: async () => { const t = await getToken(); return exportBookDocx(t, { bookId: id }); },
    onSuccess: (res) => { setExportUrl(res.url); toast.success("Word file ready"); qc.invalidateQueries({ queryKey: ["book", id] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Export failed"),
  });
  const deleteMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("books").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Book deleted");
      router.push("/dashboard");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete book"),
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
        onClick={() => router.push("/dashboard")}
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
          <Link href={`/books/${id}/print`} target="_blank" className="btn-outline">
            <Printer className="mr-1 h-4 w-4" /> Print / PDF
          </Link>
          <button
            onClick={() => {
              if (confirm("Are you sure you want to delete this book? This action cannot be undone.")) {
                deleteMut.mutate();
              }
            }}
            disabled={deleteMut.isPending}
            className="btn-outline text-red-500 hover:text-red-600 hover:border-red-600 border-red-200"
          >
            {deleteMut.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />}
            Delete
          </button>
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
                  const t = await getToken();
                  const res = await addWeek(t, { bookId: id });
                  qc.invalidateQueries({ queryKey: ["book", id] });
                  setSelection({ kind: "week", id: res.id });
                }}
                className="rounded p-1 hover:bg-secondary"
                title="Add week"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            {weeks.length === 0 && (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                Run &quot;Structure with AI&quot; to organize your notes.
              </p>
            )}
            <ul className="space-y-0.5">
              {weeks.map((w) => (
                <li key={w.id}>
                  <button
                    onClick={() => setSelection({ kind: "week", id: w.id })}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary ${
                      selection?.kind === "week" && selection.id === w.id ? "bg-secondary font-medium" : ""
                    }`}
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
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary ${
                selection?.kind === "glossary" ? "bg-secondary font-medium" : ""
              }`}
            >
              <ListTree className="h-4 w-4" /> Glossary ({terms.length})
            </button>
            <button
              onClick={() => setSelection({ kind: "scans" })}
              className={`mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary ${
                selection?.kind === "scans" ? "bg-secondary font-medium" : ""
              }`}
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
          {selection?.kind === "scans" && <ScansView bookId={id} pages={pages} onChange={() => qc.invalidateQueries({ queryKey: ["book", id] })} />}
        </main>
      </div>
    </div>
  );
}

function WeekView({
  week, topics, onChange, onDeleteWeek,
}: {
  week: { id: string; week_number: number; title: string; overview: string };
  topics: Array<{ id: string; heading: string; body_markdown: string; objectives: string[]; activities: string[] }>;
  onChange: () => void;
  onDeleteWeek: () => void;
}) {
  const [title, setTitle] = useState(week.title);
  const [overview, setOverview] = useState(week.overview);
  useEffect(() => { setTitle(week.title); setOverview(week.overview); }, [week.id]);

  const saveWeek = async () => {
    try {
      const t = await getToken();
      await updateWeek(t, { id: week.id, title, overview });
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
              const t = await getToken();
              await deleteWeek(t, { id: week.id });
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
        onClick={async () => {
          const t = await getToken();
          await addTopic(t, { weekId: week.id });
          onChange();
        }}
        className="btn-outline w-full"
      >
        <Plus className="mr-1 h-4 w-4" /> Add topic
      </button>
    </div>
  );
}

function TopicCard({ topic, onChange }: {
  topic: { id: string; heading: string; body_markdown: string; objectives: string[]; activities: string[] };
  onChange: () => void;
}) {
  const [state, setState] = useState({
    heading: topic.heading,
    body_markdown: topic.body_markdown,
    objectives: topic.objectives.join("\n"),
    activities: topic.activities.join("\n"),
  });

  const save = async () => {
    try {
      const t = await getToken();
      await updateTopic(t, {
        id: topic.id,
        heading: state.heading,
        body_markdown: state.body_markdown,
        objectives: state.objectives.split("\n").map((s) => s.trim()).filter(Boolean),
        activities: state.activities.split("\n").map((s) => s.trim()).filter(Boolean),
      });
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
          onClick={async () => {
            if (!confirm("Delete this topic?")) return;
            const t = await getToken();
            await deleteTopic(t, { id: topic.id });
            onChange();
          }}
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

function GlossaryView({ bookId, terms, onGenerate, generating, onChange }: {
  bookId: string;
  terms: Array<{ id: string; term: string; definition: string }>;
  onGenerate: () => void;
  generating: boolean;
  onChange: () => void;
}) {
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
              const t = await getToken();
              await upsertGlossaryTerm(t, { bookId, term: newTerm.trim(), definition: newDef.trim() });
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
            <GlossaryRow
              key={t.id}
              row={t}
              bookId={bookId}
              onChange={onChange}
              onDelete={async () => {
                const tok = await getToken();
                await deleteGlossaryTerm(tok, { id: t.id });
                onChange();
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function GlossaryRow({ row, bookId, onChange, onDelete }: {
  row: { id: string; term: string; definition: string };
  bookId: string;
  onChange: () => void;
  onDelete: () => void;
}) {
  const [term, setTerm] = useState(row.term);
  const [def, setDef] = useState(row.definition);
  const save = async () => {
    const t = await getToken();
    await upsertGlossaryTerm(t, { id: row.id, bookId, term, definition: def });
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

type OcrStatus = "pending" | "uploading" | "processing" | "done" | "failed";

function ScansView({ bookId, pages, onChange }: { bookId: string; pages: Array<{ id: string; page_order: number; ocr_text: string | null; ocr_status: string }>; onChange: () => void }) {
  const [items, setItems] = useState<Array<{ file: File; status: OcrStatus; message?: string }>>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return toast.error("Not signed in");
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    if (!token) return toast.error("Session expired, please sign in again");

    const userId = u.user.id;
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!arr.length) return toast.error("Upload image files (PNG/JPG)");

    const startIdx = pages.length + items.length;
    const newItems = arr.map((f) => ({ file: f, status: "uploading" as OcrStatus }));
    setItems((prev) => [...prev, ...newItems]);

    await Promise.all(
      arr.map(async (file, i) => {
        const idx = startIdx + i;
        try {
          const path = `${userId}/${bookId}/${Date.now()}-${i}-${file.name.replace(/[^\w.-]/g, "_")}`;
          const { error: upErr } = await supabase.storage
            .from("scans")
            .upload(path, file, { contentType: file.type });
          if (upErr) throw upErr;

          const { data: pageRow, error: insErr } = await supabase
            .from("pages")
            .insert({
              book_id: bookId,
              author_id: userId,
              page_order: idx,
              storage_path: path,
              mime_type: file.type,
              ocr_status: "pending",
            })
            .select("id")
            .single();
          if (insErr) throw insErr;

          setItems((prev) =>
            prev.map((it, k) =>
              k === prev.length - arr.length + i
                ? { ...it, status: "processing", message: "Reading with Gemini…" }
                : it
            )
          );

          const res = await runOcrOnPage(token, { pageId: pageRow.id });
          if (res && res.error) throw new Error(res.error);
          
          setItems((prev) =>
            prev.map((it, k) =>
              k === prev.length - arr.length + i ? { ...it, status: "done", message: "Text extracted" } : it
            )
          );
          onChange();
        } catch (e) {
          setItems((prev) =>
            prev.map((it, k) =>
              k === prev.length - arr.length + i
                ? { ...it, status: "failed", message: e instanceof Error ? e.message : "Failed" }
                : it
            )
          );
        }
      })
    );
  };

  return (
    <div>
      <h2 className="text-2xl">Scanned pages</h2>
      <p className="mt-1 text-sm text-muted-foreground">Raw OCR output from your uploaded pages. Read-only reference.</p>
      
      <div
        className="book-card mt-6 grid cursor-pointer place-items-center border-2 border-dashed py-10 text-center transition hover:border-accent"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files); }}
      >
        <Upload className="h-8 w-8" style={{ color: "var(--gold)" }} />
        <p className="mt-3 font-medium">Drop more scanned pages here, or click to browse</p>
        <p className="mt-1 text-sm text-muted-foreground">PNG or JPG · handwritten or printed</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      {items.length > 0 && (
        <div className="book-card mt-6">
          <h3 className="text-lg font-semibold">New Uploads</h3>
          <ul className="mt-4 divide-y divide-border">
            {items.map((it, i) => (
              <li key={i} className="flex items-center gap-3 py-3">
                <FileImage className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{it.file.name}</div>
                  <div className="text-xs text-muted-foreground">{it.message ?? it.status}</div>
                </div>
                <StatusBadge status={it.status} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {pages.length === 0 && items.length === 0 && <div className="book-card text-center text-muted-foreground">No pages uploaded.</div>}
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

function StatusBadge({ status }: { status: OcrStatus }) {
  if (status === "done")
    return (
      <span className="inline-flex items-center gap-1 text-sm" style={{ color: "oklch(0.55 0.15 145)" }}>
        <CheckCircle2 className="h-4 w-4" /> Done
      </span>
    );
  if (status === "failed") return <span className="text-sm text-destructive">Failed</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> {status}
    </span>
  );
}
