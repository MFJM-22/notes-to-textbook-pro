import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/books/$id")({
  component: BookDetail,
});

function BookDetail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["book", id],
    queryFn: async () => {
      const [{ data: book }, { data: pages }] = await Promise.all([
        supabase.from("books").select("*").eq("id", id).maybeSingle(),
        supabase.from("pages").select("*").eq("book_id", id).order("page_order"),
      ]);
      return { book, pages: pages ?? [] };
    },
  });

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;
  if (!data?.book) return <div>Book not found.</div>;

  const { book, pages } = data;

  return (
    <div className="max-w-4xl">
      <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All books
      </Link>
      <h1 className="text-4xl">{book.title}</h1>
      <p className="mt-2 text-muted-foreground">{book.subject} · {book.class_level} · {book.term}</p>

      <div className="mt-8">
        <h2 className="text-xl">Scanned pages ({pages.length})</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review the OCR output below. AI structuring, glossary, and Word/PDF export are the next slice.
        </p>

        <div className="mt-6 space-y-4">
          {pages.length === 0 && (
            <div className="book-card text-center text-muted-foreground">No pages yet.</div>
          )}
          {pages.map((p, i) => (
            <div key={p.id} className="book-card">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Page {i + 1}</div>
                <div className="text-xs text-muted-foreground">
                  {p.ocr_status}
                  {p.ocr_confidence != null && ` · confidence ${(p.ocr_confidence * 100).toFixed(0)}%`}
                </div>
              </div>
              <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-4 font-sans text-sm">
                {p.ocr_text || "(no text extracted yet)"}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
