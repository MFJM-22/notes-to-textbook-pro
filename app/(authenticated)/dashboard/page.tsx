"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { BookOpen, Plus, Clock, CheckCircle2, ScanText, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const statusLabel: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  uploading: { label: "Uploading", icon: Clock, color: "oklch(0.72 0.14 55)" },
  ocr_processing: { label: "OCR Processing", icon: ScanText, color: "oklch(0.65 0.15 240)" },
  awaiting_review: { label: "Awaiting Review", icon: Clock, color: "oklch(0.72 0.14 55)" },
  awaiting_structuring: { label: "Ready to structure", icon: ScanText, color: "oklch(0.65 0.15 240)" },
  structured: { label: "Structured", icon: CheckCircle2, color: "oklch(0.6 0.14 165)" },
  generated: { label: "Generated", icon: CheckCircle2, color: "oklch(0.55 0.15 145)" },
};

export default function DashboardPage() {
  const qc = useQueryClient();
  const { data: books = [], isLoading } = useQuery({
    queryKey: ["books"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const counts = {
    total: books.length,
    inProgress: books.filter((b) => b.status !== "generated").length,
    generated: books.filter((b) => b.status === "generated").length,
  };

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("books").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Book deleted");
      qc.invalidateQueries({ queryKey: ["books"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete book"),
  });

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl">Your books</h1>
          <p className="mt-2 text-muted-foreground">Every textbook you&apos;re crafting, in one place.</p>
        </div>
        <Link href="/books/new" className="btn-primary btn-primary-hover">
          <Plus className="mr-1 h-4 w-4" /> New book
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total books", value: counts.total },
          { label: "In progress", value: counts.inProgress },
          { label: "Generated", value: counts.generated },
        ].map((s) => (
          <div key={s.label} className="book-card">
            <div className="text-sm text-muted-foreground">{s.label}</div>
            <div className="mt-1 text-3xl font-semibold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="mt-10">
        {isLoading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : books.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((b) => {
              const s = statusLabel[b.status] ?? statusLabel.uploading;
              const Icon = s.icon;
              return (
                <div key={b.id} className="relative group">
                  <Link
                    href={`/books/${b.id}`}
                    className="book-card book-card-hover block h-full"
                  >
                    <div className="flex items-start justify-between pr-8">
                      <BookOpen className="h-6 w-6" style={{ color: "var(--gold)" }} />
                      <span
                        className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs"
                        style={{ color: s.color }}
                      >
                        <Icon className="h-3 w-3" /> {s.label}
                      </span>
                    </div>
                    <h3 className="mt-4 text-xl font-semibold leading-snug">{b.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {b.subject} · {b.class_level} · {b.term}
                    </p>
                  </Link>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      if (confirm("Are you sure you want to delete this book? This action cannot be undone.")) {
                        deleteMut.mutate(b.id);
                      }
                    }}
                    className="absolute top-4 right-4 p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete book"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="book-card grid place-items-center py-16 text-center">
      <BookOpen className="h-10 w-10" style={{ color: "var(--gold)" }} />
      <h3 className="mt-4 text-xl">No books yet</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Upload your lesson notes and we&apos;ll help you turn them into a textbook.
      </p>
      <Link href="/books/new" className="btn-primary btn-primary-hover mt-6">
        <Plus className="mr-1 h-4 w-4" /> Create your first book
      </Link>
    </div>
  );
}
