import Link from "next/link";
import { BookOpen, Sparkles, ScanText, FileDown } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div
            className="grid h-9 w-9 place-items-center rounded-lg"
            style={{ background: "var(--gradient-ink)" }}
          >
            <BookOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">Textbook Studio</span>
        </div>
        <nav className="flex gap-3">
          <Link href="/auth" className="btn-outline">
            Sign in
          </Link>
          <Link href="/auth" className="btn-primary btn-primary-hover">
            Get started
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 pt-16 pb-24">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--gold)" }} />
            For JSS1 &amp; JSS2 teachers
          </span>
          <h1 className="mt-6 text-5xl leading-tight md:text-6xl">
            From handwritten notes to a{" "}
            <span style={{ color: "var(--gold)" }}>publication-ready textbook</span>.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Scan your lesson notes. We turn them into a beautifully typeset textbook —
            weeks, topics, glossary, and a Word export you can print or hand to a publisher.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/auth" className="btn-primary btn-primary-hover">
              Start your first book
            </Link>
            <a href="#how" className="btn-outline">
              How it works
            </a>
          </div>
        </div>

        <section id="how" className="mt-24 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: ScanText,
              title: "Scan & OCR",
              desc: "Drop in photos of your notes. Gemini vision reads even handwritten pages with high accuracy.",
            },
            {
              icon: Sparkles,
              title: "AI structuring",
              desc: "Content is organised into Weeks, Topics, and Sections — with a glossary tailored to JSS1/JSS2 vocabulary.",
            },
            {
              icon: FileDown,
              title: "Word & PDF",
              desc: "Export a formatted .docx with cover, TOC, and author page. Print to PDF straight from the browser.",
            },
          ].map((f) => (
            <div key={f.title} className="book-card book-card-hover">
              <f.icon className="h-6 w-6" style={{ color: "var(--gold)" }} />
              <h3 className="mt-4 text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
