import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, LayoutDashboard, User, LogOut, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthLayout,
});

function AuthLayout() {
  const navigate = useNavigate();
  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: "var(--gradient-ink)" }}>
              <BookOpen className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Textbook Studio</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link to="/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-secondary" activeProps={{ className: "bg-secondary" }}>
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Link>
            <Link to="/profile" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-secondary" activeProps={{ className: "bg-secondary" }}>
              <User className="h-4 w-4" /> Author
            </Link>
            <Link to="/books/new" className="btn-primary btn-primary-hover ml-2">
              <Plus className="mr-1 h-4 w-4" /> New book
            </Link>
            <button onClick={signOut} className="ml-1 rounded-lg p-2 text-muted-foreground hover:bg-secondary" title="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
