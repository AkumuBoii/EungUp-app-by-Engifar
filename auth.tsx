import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Mascot } from "@/components/Mascot";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — EungUp" },
      { name: "description", content: "Sign in to EungUp to track study streaks, earn worms and collect memes." },
      { property: "og:title", content: "Sign in — EungUp" },
      { property: "og:description", content: "Join your class, keep your streak and farm worms with อึ่ง." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" });
  }, [loading, session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Check your email to confirm, then sign in. อึ่ง will wait.");
          setMode("signin");
          return;
        }
        toast.success("Welcome! อึ่ง is proud already.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="paper flex min-h-screen items-center justify-center px-4 py-10">
      <div className="ink-card w-full max-w-md p-7">
        <div className="flex flex-col items-center text-center">
          <Mascot size={96} mood="hype" float />
          <h1 className="mt-3 font-display text-3xl font-extrabold">
            {mode === "signup" ? "Join EungUp" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signup" ? "อึ่ง needs a new study buddy." : "Your streak missed you."}
          </p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@school.ac.th"
            className="ink-border w-full rounded-xl bg-card px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            className="ink-border w-full rounded-xl bg-card px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={busy}
            className="ink-border w-full rounded-xl bg-primary px-4 py-3 font-display text-lg font-extrabold text-primary-foreground shadow-ink-sm disabled:opacity-60"
          >
            {busy ? "…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </form>

        <button
          onClick={google}
          className="ink-border mt-3 w-full rounded-xl bg-card px-4 py-3 font-display font-extrabold"
        >
          Continue with Google
        </button>

        <button
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          className="mt-4 w-full text-sm font-bold text-muted-foreground underline"
        >
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>

        <Link to="/" className="mt-3 block text-center text-xs font-bold text-muted-foreground">
          ← back home
        </Link>
      </div>
    </div>
  );
}
