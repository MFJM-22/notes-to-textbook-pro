"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Toaster } from "sonner";
import { BookOpen, LayoutDashboard, User, LogOut, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthenticatedShell>{children}</AuthenticatedShell>
      <Toaster richColors />
    </QueryClientProvider>
  );
}

function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/auth");
      } else {
        setChecking(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session && event !== "INITIAL_SESSION") {
        router.replace("/auth");
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  const navLink = (href: string, label: string, Icon: React.ComponentType<{ className?: string }>) => (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-secondary ${
        pathname === href || pathname.startsWith(href + "/") ? "bg-secondary font-medium" : ""
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div
              className="grid h-8 w-8 place-items-center rounded-lg"
              style={{ background: "var(--gradient-ink)" }}
            >
              <BookOpen className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Textbook Studio</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navLink("/dashboard", "Dashboard", LayoutDashboard)}
            {navLink("/profile", "Author", User)}
            <Link href="/books/new" className="btn-primary btn-primary-hover ml-2">
              <Plus className="mr-1 h-4 w-4" /> New book
            </Link>
            <button
              onClick={signOut}
              className="ml-1 rounded-lg p-2 text-muted-foreground hover:bg-secondary"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
