import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  component: Profile,
});

function Profile() {
  const qc = useQueryClient();
  const { data: author, isLoading } = useQuery({
    queryKey: ["author"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("no user");
      const { data, error } = await supabase.from("authors").select("*").eq("id", u.user.id).maybeSingle();
      if (error) throw error;
      return data ?? { id: u.user.id, full_name: "", bio: "", credentials: "", avatar_url: null };
    },
  });

  const [form, setForm] = useState({ full_name: "", bio: "", credentials: "", avatar_url: "" });
  useEffect(() => {
    if (author) setForm({
      full_name: author.full_name ?? "",
      bio: author.bio ?? "",
      credentials: author.credentials ?? "",
      avatar_url: author.avatar_url ?? "",
    });
  }, [author]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("no user");
      const { error } = await supabase.from("authors").upsert({ id: u.user.id, ...form });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["author"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-4xl">About the author</h1>
      <p className="mt-2 text-muted-foreground">
        This appears on the "About the Author" page of every book you publish.
      </p>

      <div className="book-card mt-8 space-y-5">
        <div className="flex items-center gap-4">
          {form.avatar_url ? (
            <img src={form.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="grid h-16 w-16 place-items-center rounded-full bg-secondary">
              <User className="h-7 w-7 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1">
            <label className="text-sm font-medium">Avatar URL</label>
            <input
              type="url" placeholder="https://…" value={form.avatar_url}
              onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Full name</label>
          <input
            type="text" value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Credentials</label>
          <input
            type="text" placeholder="e.g. B.Ed Mathematics, 12 years teaching JSS"
            value={form.credentials}
            onChange={(e) => setForm({ ...form, credentials: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Bio</label>
          <textarea
            rows={5} value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary btn-primary-hover">
          {save.isPending ? "Saving…" : "Save profile"}
        </button>
      </div>
    </div>
  );
}
