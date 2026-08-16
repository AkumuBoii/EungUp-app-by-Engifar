import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { completeOnboarding } from "@/lib/memestudy.functions";
import { useAuth } from "@/hooks/useAuth";
import { Mascot } from "@/components/Mascot";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Create your อึ่ง — EungUp" },
      { name: "description", content: "Pick your mascot skin, set a daily study goal and start earning worms." },
      { property: "og:title", content: "Create your อึ่ง — EungUp" },
      { property: "og:description", content: "Set up your EungUp character and daily goal in under a minute." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

const SKINS = [
  { id: "classic", label: "Classic อึ่ง", mood: "smug" as const },
  { id: "hype", label: "Hype อึ่ง", mood: "hype" as const },
  { id: "sleepy", label: "Sleepy อึ่ง", mood: "sleepy" as const },
];

const GOALS = [30, 60, 90, 120, 180];

function Onboarding() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const qc = useQueryClient();
  const save = useServerFn(completeOnboarding);

  const [step, setStep] = useState(0);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [skin, setSkin] = useState("classic");
  const [goal, setGoal] = useState(60);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  async function finish() {
    setBusy(true);
    try {
      await save({
        data: { username, displayName, mascotSkin: skin, dailyGoalMin: goal },
      });
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("อึ่ง is ready. Go get those worms 🪱");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="paper flex min-h-screen items-center justify-center px-4 py-10">
      <div className="ink-card w-full max-w-lg p-7">
        <div className="flex items-center gap-3">
          <Mascot size={72} mood={SKINS.find((s) => s.id === skin)?.mood ?? "smug"} />
          <div>
            <h1 className="font-display text-2xl font-extrabold">Create your character</h1>
            <p className="text-sm text-muted-foreground">Step {step + 1} of 2</p>
          </div>
        </div>

        {step === 0 && (
          <div className="mt-6 space-y-3">
            <label className="block text-sm font-extrabold">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
              placeholder="frogboss"
              className="ink-border w-full rounded-xl bg-card px-4 py-3 font-bold"
            />
            <label className="block text-sm font-extrabold">Display name</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nong Ueng"
              className="ink-border w-full rounded-xl bg-card px-4 py-3 font-bold"
            />
            <div className="grid grid-cols-3 gap-2 pt-2">
              {SKINS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSkin(s.id)}
                  className={cn(
                    "ink-border flex flex-col items-center gap-1 rounded-xl p-3 text-xs font-extrabold",
                    skin === s.id ? "bg-primary text-primary-foreground" : "bg-card",
                  )}
                >
                  <Mascot size={54} mood={s.mood} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="mt-6">
            <p className="text-sm font-extrabold">Daily study goal</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {GOALS.map((g) => (
                <button
                  key={g}
                  onClick={() => setGoal(g)}
                  className={cn(
                    "ink-border rounded-full px-4 py-2 font-extrabold",
                    goal === g ? "bg-primary text-primary-foreground" : "bg-card",
                  )}
                >
                  {g} min
                </button>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Hit this every day to keep your streak. Miss it and อึ่ง posts about you.
            </p>
          </div>
        )}

        <div className="mt-7 flex gap-2">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="ink-border rounded-xl bg-card px-4 py-3 font-extrabold">
              Back
            </button>
          )}
          <button
            disabled={busy || (step === 0 && username.trim().length < 3)}
            onClick={() => (step === 1 ? finish() : setStep(step + 1))}
            className="ink-border flex-1 rounded-xl bg-primary px-4 py-3 font-display text-lg font-extrabold text-primary-foreground shadow-ink-sm disabled:opacity-50"
          >
            {step === 1 ? (busy ? "Saving…" : "Let's go") : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
