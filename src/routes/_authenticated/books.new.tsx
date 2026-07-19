import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Upload, CheckCircle2, Loader2, FileImage } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { runOcrOnPage } from "@/lib/ocr.functions";

export const Route = createFileRoute("/_authenticated/books/new")({
  component: NewBookWizard,
});

const SUBJECTS = ["Mathematics", "English Studies", "Basic Science", "Social Studies", "Civic Education", "Agricultural Science", "Business Studies", "Computer Studies", "Home Economics", "Cultural & Creative Arts", "History", "Christian Religious Studies", "Islamic Religious Studies"];
const CLASSES = ["JSS1", "JSS2"];
const TERMS = ["First Term", "Second Term", "Third Term"];

type OcrStatus = "queued" | "uploading" | "processing" | "done" | "failed";
interface UploadItem {
  file: File;
  pageId?: string;
  status: OcrStatus;
  message?: string;
}

function NewBookWizard() {
  const navigate = useNavigate();
  const runOcr = useServerFn(runOcrOnPage);
  const [step, setStep] = useState<1 | 2>(1);
  const [meta, setMeta] = useState({ title: "", subject: SUBJECTS[0], class_level: CLASSES[0], term: TERMS[0] });
  const [bookId, setBookId] = useState<string | null>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [creating, setCreating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const createBook = async () => {
    if (!meta.title.trim()) return toast.error("Give your book a title");
    setCreating(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data, error } = await supabase.from("books").insert({
        author_id: u.user.id,
        title: meta.title.trim(),
        subject: meta.subject,
        class_level: meta.class_level,
        term: meta.term,
        status: "uploading",
      }).select("id").single();
      if (error) throw error;
      setBookId(data.id);
      setStep(2);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create book");
    } finally {
      setCreating(false);
    }
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || !bookId) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return toast.error("Not signed in");
    const userId = u.user.id;
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!arr.length) return toast.error("Upload image files (PNG/JPG)");

    const startIdx = items.length;
    setItems((prev) => [...prev, ...arr.map((f) => ({ file: f, status: "uploading" as OcrStatus }))]);

    await Promise.all(arr.map(async (file, i) => {
      const idx = startIdx + i;
      try {
        const path = `${userId}/${bookId}/${Date.now()}-${i}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("scans").upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        const { data: pageRow, error: insErr } = await supabase.from("pages").insert({
          book_id: bookId, author_id: userId, page_order: idx,
          storage_path: path, mime_type: file.type, ocr_status: "pending",
        }).select("id").single();
        if (insErr) throw insErr;

        setItems((prev) => prev.map((it, k) => k === idx ? { ...it, pageId: pageRow.id, status: "processing", message: "Reading with Gemini…" } : it));

        await runOcr({ data: { pageId: pageRow.id } });
        setItems((prev) => prev.map((it, k) => k === idx ? { ...it, status: "done", message: "Text extracted" } : it));
      } catch (e) {
        setItems((prev) => prev.map((it, k) => k === idx ? { ...it, status: "failed", message: e instanceof Error ? e.message : "Failed" } : it));
      }
    }));

    // Update book status
    await supabase.from("books").update({ status: "awaiting_structuring" }).eq("id", bookId);
  };

  return (
    <div className="max-w-3xl">
      <button onClick={() => navigate({ to: "/dashboard" })} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </button>

      <div className="mb-8 flex items-center gap-3">
        <Stepper n={1} label="Details" active={step === 1} done={step > 1} />
        <div className="h-px flex-1 bg-border" />
        <Stepper n={2} label="Upload & OCR" active={step === 2} done={false} />
      </div>

      {step === 1 && (
        <div className="book-card space-y-5">
          <h1 className="text-3xl">New book</h1>
          <div>
            <label className="text-sm font-medium">Title</label>
            <input
              type="text" placeholder="e.g. JSS1 Basic Science, First Term"
              value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Subject">
              <select value={meta.subject} onChange={(e) => setMeta({ ...meta, subject: e.target.value })} className="input-select">
                {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Class">
              <select value={meta.class_level} onChange={(e) => setMeta({ ...meta, class_level: e.target.value })} className="input-select">
                {CLASSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Term">
              <select value={meta.term} onChange={(e) => setMeta({ ...meta, term: e.target.value })} className="input-select">
                {TERMS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <div className="flex justify-end">
            <button onClick={createBook} disabled={creating} className="btn-primary btn-primary-hover">
              {creating ? "Creating…" : <>Continue <ArrowRight className="ml-1 h-4 w-4" /></>}
            </button>
          </div>
          <style>{`.input-select{width:100%;border-radius:.5rem;border:1px solid var(--color-border);background:var(--color-background);padding:.5rem .75rem;font-size:.875rem;outline:none}`}</style>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div
            className="book-card grid cursor-pointer place-items-center border-2 border-dashed py-14 text-center transition hover:border-accent"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files); }}
          >
            <Upload className="h-8 w-8" style={{ color: "var(--gold)" }} />
            <p className="mt-3 font-medium">Drop scanned pages here, or click to browse</p>
            <p className="mt-1 text-sm text-muted-foreground">PNG or JPG · handwritten or printed</p>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
          </div>

          {items.length > 0 && (
            <div className="book-card">
              <h3 className="text-lg font-semibold">Pages</h3>
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
              <div className="mt-6 flex justify-end">
                <button onClick={() => navigate({ to: "/dashboard" })} className="btn-primary btn-primary-hover">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stepper({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="grid h-8 w-8 place-items-center rounded-full text-sm font-semibold"
        style={{
          background: active || done ? "var(--gradient-ink)" : "var(--color-secondary)",
          color: active || done ? "var(--color-primary-foreground)" : "var(--color-muted-foreground)",
        }}
      >
        {done ? <CheckCircle2 className="h-4 w-4" /> : n}
      </div>
      <span className={active ? "font-medium" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: OcrStatus }) {
  if (status === "done") return <span className="inline-flex items-center gap-1 text-sm" style={{ color: "oklch(0.55 0.15 145)" }}><CheckCircle2 className="h-4 w-4" /> Done</span>;
  if (status === "failed") return <span className="text-sm text-destructive">Failed</span>;
  return <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {status}</span>;
}
