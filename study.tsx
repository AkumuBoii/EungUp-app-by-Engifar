import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Swords, Timer, Users } from "lucide-react";
import { startSession, stopSession, listSubjectsAndTasks } from "@/lib/memestudy.functions";
import { getBattleArena } from "@/lib/battles.functions";
import { AppShell } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { BattleMode } from "@/components/BattleMode";
import { ClassSwitcher } from "@/components/ClassSwitcher";
import { useActiveClass } from "@/hooks/useActiveClass";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/study")({
  head: () => ({
    meta: [
      { title: "Study — focus, study room & battles — EungUp" },
      { name: "description", content: "Focus Mode timers, a live Study Room with your class, and Battle Mode challenges with meme bets." },
      { property: "og:title", content: "Study — EungUp" },
      { property: "og:description", content: "Run a verified study session, study with your class or battle a friend for their meme." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudyPage,
});

type Mode = "stopwatch" | "countdown" | "task_focus";

const SECTIONS = [
  { key: "focus", label: "Focus Mode", icon: Timer },
  { key: "room", label: "Study Room", icon: Users },
  { key: "battle", label: "Battle Mode", icon: Swords },
] as const;

type Section = (typeof SECTIONS)[number]["key"];

function StudyPage() {
  const [section, setSection] = useState<Section>("focus");
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSection(s.key)}
              className={cn(
                "ink-border flex items-center gap-2 rounded-full px-4 py-2 font-display text-sm font-extrabold",
                section === s.key ? "bg-primary text-primary-foreground shadow-ink-sm" : "bg-card",
              )}
            >
              <s.icon className="size-4" />
              {s.label}
            </button>
          ))}
        </div>
        {section === "focus" && <StudyTimer />}
        {section === "room" && <StudyRoom />}
        {section === "battle" && <BattleMode />}
      </div>
    </AppShell>
  );
}

/** Live view of who in the class is studying right now. */
function StudyRoom() {
  const { session } = useAuth();
  const { activeClassId, activeClass } = useActiveClass();
  const load = useServerFn(getBattleArena);
  const arena = useQuery({
    queryKey: ["battle-arena", activeClassId, session?.user.id],
    queryFn: () => load({ data: { classId: activeClassId! } }),
    enabled: Boolean(activeClassId && session),
    refetchInterval: 20_000,
  });

  if (!activeClassId) return <p className="ink-card p-5 font-bold">Join a class to open its study room.</p>;

  const people = arena.data?.opponents ?? [];
  const online = people.filter((p) => p.online);

  return (
    <div className="space-y-4">
      <div className="ink-card flex flex-wrap items-center gap-4 bg-secondary p-5">
        <Mascot size={64} mood={online.length ? "hype" : "sleepy"} float={online.length > 0} />
        <div>
          <p className="font-display text-xl font-extrabold">{activeClass?.name ?? "Study room"}</p>
          <p className="text-sm font-bold text-muted-foreground">
            {online.length} classmate{online.length === 1 ? "" : "s"} studying right now
          </p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {people.map((p) => (
          <div key={p.id} className="ink-card flex items-center gap-3 p-3">
            <Mascot size={40} mood={p.online ? "hype" : "sleepy"} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-extrabold">{p.display_name ?? p.username}</span>
              <span className="block text-xs font-bold text-muted-foreground">
                🔥 {p.streak} · Lv {p.level} · {p.wins} battle wins
              </span>
            </span>
            <span className={cn("size-3 rounded-full border-2 border-ink", p.online ? "bg-primary" : "bg-muted")} />
          </div>
        ))}
        {!people.length && <p className="ink-card p-4 font-bold">Nobody else in this class yet.</p>}
      </div>
    </div>
  );
}


function pad(n: number) {
  return String(n).padStart(2, "0");
}

function clock(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function StudyTimer() {
  const qc = useQueryClient();
  const { activeClass, activeClassId } = useActiveClass();
  const begin = useServerFn(startSession);
  const finish = useServerFn(stopSession);
  const listData = useServerFn(listSubjectsAndTasks);
  const data = useQuery({
    queryKey: ["subjects-tasks", activeClassId],
    queryFn: () => listData({ data: { classId: activeClassId } }),
    enabled: Boolean(activeClassId),
  });

  const [mode, setMode] = useState<Mode>("stopwatch");
  const [targetMin, setTargetMin] = useState(25);
  const [taskId, setTaskId] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  const running = Boolean(sessionId);
  const targetSec = targetMin * 60;

  useEffect(() => {
    if (!running) return;
    tick.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [running]);

  useEffect(() => {
    if (!running) return;
    function onHide() {
      if (document.visibilityState === "hidden") {
        setStrikes((s) => s + 1);
      } else {
        toast.warning("อึ่ง saw that. Strike added — validated time gets shaved.");
      }
    }
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [running]);

  const stopMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) return null;
      return finish({ data: { sessionId, elapsedSec: elapsed, strikes, classId: activeClassId } });
    },
    onSuccess: (result) => {
      setSessionId(null);
      setElapsed(0);
      setStrikes(0);
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
      if (!result) return;
      toast.success(`+${result.worms} 🪱 · +${result.xp} XP for ${result.minutes} min`);
      if (result.milestone) toast.success(`${result.milestone}-day streak! อึ่ง is screaming.`);
      if (result.drop) toast.success(`Meme drop: ${result.drop.title} (${result.drop.rarity})`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save session"),
  });

  useEffect(() => {
    if (mode === "countdown" && running && elapsed >= targetSec) {
      stopMutation.mutate();
    }
  }, [mode, running, elapsed, targetSec, stopMutation]);

  async function start() {
    try {
      const session = await begin({
        data: {
          mode,
          taskId: mode === "task_focus" && taskId ? taskId : null,
          targetSec: mode === "countdown" ? targetSec : null,
        },
      });
      setSessionId(session.id);
      setElapsed(0);
      setStrikes(0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start");
    }
  }

  const remaining = mode === "countdown" ? Math.max(0, targetSec - elapsed) : elapsed;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-display text-lg font-extrabold">
          Studying for {activeClass?.name ?? "no class"}
        </p>
        <ClassSwitcher className="ml-auto" />
      </div>
      <div className="ink-card flex flex-col items-center gap-4 bg-secondary p-8">
        <Mascot size={120} mood={running ? (strikes > 0 ? "shame" : "hype") : "smug"} float={running && strikes === 0} />
        <p className="font-display text-6xl font-extrabold tabular-nums">{clock(remaining)}</p>
        <p className="text-sm font-bold text-muted-foreground">
          {running ? "อึ่ง is watching. Do not switch tabs." : "Pick a mode and go."}
        </p>
        {strikes > 0 && (
          <p className="ink-border flex items-center gap-2 rounded-full bg-card px-3 py-1 text-sm font-extrabold text-shame">
            <AlertTriangle className="size-4" /> {strikes} strike{strikes > 1 ? "s" : ""} · -{Math.min(strikes, 3) * 10}% time
          </p>
        )}
        {!running ? (
          <button
            onClick={start}
            className="ink-border rounded-2xl bg-primary px-8 py-4 font-display text-xl font-extrabold text-primary-foreground shadow-ink"
          >
            Start session
          </button>
        ) : (
          <button
            onClick={() => stopMutation.mutate()}
            disabled={stopMutation.isPending}
            className="ink-border rounded-2xl bg-card px-8 py-4 font-display text-xl font-extrabold shadow-ink"
          >
            {stopMutation.isPending ? "Saving…" : "Finish & claim worms"}
          </button>
        )}
      </div>

      {!running && (
        <div className="ink-card space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            {(["stopwatch", "countdown", "task_focus"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "ink-border rounded-full px-4 py-2 text-sm font-extrabold",
                  mode === m ? "bg-primary text-primary-foreground" : "bg-card",
                )}
              >
                {m === "task_focus" ? "task focus" : m}
              </button>
            ))}
          </div>

          {mode === "countdown" && (
            <div className="flex flex-wrap gap-2">
              {[15, 25, 45, 60, 90].map((m) => (
                <button
                  key={m}
                  onClick={() => setTargetMin(m)}
                  className={cn(
                    "ink-border rounded-full px-4 py-2 text-sm font-extrabold",
                    targetMin === m ? "bg-accent" : "bg-card",
                  )}
                >
                  {m} min
                </button>
              ))}
            </div>
          )}

          {mode === "task_focus" && (
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="ink-border w-full rounded-xl bg-card px-4 py-3 font-bold"
            >
              <option value="">Pick a task…</option>
              {(data.data?.tasks ?? [])
                .filter((t) => t.status !== "done")
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
