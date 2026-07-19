import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/books/$id/print")({
  component: PrintView,
});

function PrintView() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["book-print", id],
    queryFn: async () => {
      const [{ data: book }, { data: author }, { data: weeks }, { data: topics }, { data: glossary }] = await Promise.all([
        supabase.from("books").select("*").eq("id", id).maybeSingle(),
        supabase.auth.getUser().then(async ({ data: u }) => {
          if (!u.user) return { data: null } as const;
          return supabase.from("authors").select("*").eq("id", u.user.id).maybeSingle();
        }),
        supabase.from("weeks").select("*").eq("book_id", id).order("order_index"),
        supabase.from("topics").select("*").eq("book_id", id).order("order_index"),
        supabase.from("glossary_terms").select("*").eq("book_id", id).order("term"),
      ]);
      return { book, author, weeks: weeks ?? [], topics: topics ?? [], glossary: glossary ?? [] };
    },
  });

  useEffect(() => {
    if (data?.book) document.title = `${data.book.title} — Print`;
  }, [data?.book]);

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!data?.book) return <div className="p-8">Book not found.</div>;
  const { book, author, weeks, topics, glossary } = data;

  return (
    <div className="print-root">
      <div className="print-toolbar no-print">
        <Link to="/books/$id" params={{ id }} className="btn-outline">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Link>
        <button onClick={() => window.print()} className="btn-primary btn-primary-hover">
          <Printer className="mr-1 h-4 w-4" /> Print / Save as PDF
        </button>
      </div>

      <article className="print-page">
        {/* Cover */}
        <section className="cover">
          <h1>{book.title}</h1>
          <p className="meta">{book.subject} · {book.class_level} · {book.term}</p>
          <div className="author">
            <div className="author-name">{author?.full_name}</div>
            <div className="author-credentials">{author?.credentials}</div>
          </div>
        </section>

        {/* TOC */}
        <section className="page-break">
          <h2>Contents</h2>
          <ol className="toc">
            {weeks.map((w) => (
              <li key={w.id}>Week {w.week_number}: {w.title}</li>
            ))}
            {glossary.length > 0 && <li>Glossary</li>}
          </ol>
        </section>

        {/* Weeks */}
        {weeks.map((w) => (
          <section key={w.id} className="page-break">
            <h2>Week {w.week_number}: {w.title}</h2>
            {w.overview && <p className="overview">{w.overview}</p>}
            {topics.filter((t) => t.week_id === w.id).map((t) => (
              <div key={t.id} className="topic">
                <h3>{t.heading}</h3>
                {t.body_markdown.split(/\n\s*\n/).filter(Boolean).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                {t.objectives?.length ? (
                  <>
                    <h4>Learning objectives</h4>
                    <ul>{t.objectives.map((o, i) => <li key={i}>{o}</li>)}</ul>
                  </>
                ) : null}
                {t.activities?.length ? (
                  <>
                    <h4>Activities</h4>
                    <ol>{t.activities.map((a, i) => <li key={i}>{a}</li>)}</ol>
                  </>
                ) : null}
              </div>
            ))}
          </section>
        ))}

        {/* Glossary */}
        {glossary.length > 0 && (
          <section className="page-break">
            <h2>Glossary</h2>
            <dl>
              {glossary.map((g) => (
                <div key={g.id} className="glossary-item">
                  <dt>{g.term}</dt>
                  <dd>{g.definition}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </article>

      <style>{`
        .print-root { background: #fff; color: #111; }
        .print-toolbar { position: sticky; top: 0; z-index: 10; display: flex; gap: 8px; justify-content: flex-end; padding: 12px 24px; background: #fff; border-bottom: 1px solid #eee; }
        .print-page { max-width: 780px; margin: 0 auto; padding: 40px 60px; font-family: Georgia, 'Times New Roman', serif; font-size: 12pt; line-height: 1.55; }
        .print-page h1 { font-size: 32pt; margin: 0 0 12px; }
        .print-page h2 { font-size: 20pt; margin: 32px 0 12px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
        .print-page h3 { font-size: 15pt; margin: 24px 0 8px; }
        .print-page h4 { font-size: 12pt; margin: 16px 0 4px; text-transform: uppercase; letter-spacing: .04em; }
        .print-page p { margin: 0 0 10px; }
        .print-page ul, .print-page ol { padding-left: 22px; margin: 0 0 12px; }
        .cover { min-height: 80vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
        .cover h1 { font-size: 40pt; }
        .cover .meta { font-size: 14pt; color: #444; margin-bottom: 60px; }
        .cover .author-name { font-size: 14pt; font-weight: bold; }
        .cover .author-credentials { font-style: italic; color: #555; }
        .overview { font-style: italic; color: #444; }
        .toc { padding-left: 24px; }
        .toc li { margin: 6px 0; }
        .glossary-item { margin: 8px 0; }
        .glossary-item dt { display: inline; font-weight: bold; }
        .glossary-item dd { display: inline; margin-left: 6px; }
        @media print {
          .no-print { display: none !important; }
          .print-page { max-width: none; margin: 0; padding: 0; }
          .page-break { page-break-before: always; }
          @page { size: A4; margin: 20mm; }
        }
      `}</style>
    </div>
  );
}
