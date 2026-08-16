import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Brain, Flame, Timer, Trophy } from "lucide-react";
import { getBattleRoom, getBattleQuiz, submitBattleResult } from "@/lib/battles.functions";
import { AppShell } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { MemeImage } from "@/components/MemeCard";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/battle/$battleId")({
  head: () => ({
    meta: [
      { title: "Battle Arena — study duel — EungUp" },
      { name: "description", content: "Live EungUp battle screen: timer, quiz, meme pot and results against your classmate." },
      { property: "og:title", content: "Battle Arena — EungUp" },
      { property: "og:description", content: "Study duel in progress — timer, quiz and meme bet on the line." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BattleRoomPage,
});

function clock(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

const MODE_ICON = { set_time: Timer, quiz: Brain, focus: Flame } as const;

function BattleRoomPage() {
  const { battleId } = Route.useParams();
  const { session, loading } = useAuth();
  const load = useServerFn(getBattleRoom);

  const room = useQuery({
    queryKey: ["battle-room", battleId, session?.user.id],
    queryFn: () => load({ data: { battleId } }),
    enabled: Boolean(session) && !loading,
    // live sync without a page refresh
    refetchInterval: 4000,
    refetchOnWindowFocus: true,
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-4">
        <Link to="/study" className="ink-border inline-flex items-center gap-2 rounded-xl bg-card px-4 py-2 font-extrabold">
          <ArrowLeft className="size-4" /> Back to arena
        </Link>
        {room.isLoading && <p className="ink-card p-5 font-bold">Opening the arena…</p>}
        {room.error && (
          <p className="ink-card p-5 font-bold text-shame">
            {room.error instanceof Error ? room.error.message : "Could not load this battle."}
          </p>
        )}
        {room.data && <BattleRoom key={battleId} data={room.data} onChange={() => room.refetch()} />}
      </div>
    </AppShell>
  );
}

type Room = Awaited<ReturnType<typeof getBattleRoom>>;

function BattleRoom({ data, onChange }: { data: Room; onChange: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const quizFn = useServerFn(getBattleQuiz);
  const submitFn = useServerFn(submitBattleResult);

  const { battle, meId, opponent, tasks, bets, results } = data;
  const mode = battle.mode as "set_time" | "quiz" | "focus";
  const Icon = MODE_ICON[mode] ?? Timer;
  const myResult = results.find((r) => r.user_id === meId);
  const theirResult = results.find((r) => r.user_id !== meId);
  const finished = battle.status === "finished";
  const active = battle.status === "active";

  const [phase, setPhase] = useState<"study" | "quiz" | "done">(mode === "quiz" ? "quiz" : "study");
  const [elapsed, setElapsed] = useState(0);
  const [distractions, setDistractions] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const started = useRef(Date.now());
  const announced = useRef(false);

  // "Battle Started" notification once the arena is live.
  useEffect(() => {
    if (active && !announced.current) {
      announced.current = true;
      toast.success(
        `Battle started · ${battle.modeLabel} vs ${opponent?.display_name ?? opponent?.username ?? "your rival"}`,
      );
    }
  }, [active, battle.modeLabel, opponent]);

  const targetSec = battle.target_sec ?? 0;

  useEffect(() => {
    if (!active || myResult || phase !== "study") return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [active, myResult, phase]);

  useEffect(() => {
    if (!active || myResult || phase !== "study") return;
    function onHide() {
      if (document.visibilityState === "hidden") setDistractions((d) => d + 1);
      else toast.warning("อึ่ง saw you leave. Distraction counted.");
    }
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [active, myResult, phase]);

  useEffect(() => {
    if (mode === "set_time" && phase === "study" && targetSec > 0 && elapsed >= targetSec) setPhase("quiz");
  }, [mode, phase, elapsed, targetSec]);

  const quiz = useQuery({
    queryKey: ["battle-quiz", battle.id],
    queryFn: () => quizFn({ data: { battleId: battle.id } }),
    enabled: active && !myResult && phase === "quiz",
    staleTime: Infinity,
  });

  const submit = useMutation({
    mutationFn: (v: { score: number; maxScore: number; durationSec: number; distractions: number }) =>
      submitFn({ data: { battleId: battle.id, ...v } }),
    onSuccess: (res) => {
      setPhase("done");
      qc.invalidateQueries({ queryKey: ["battle-arena"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      onChange();
      if (res.resolved) {
        toast.success(res.winnerId === meId ? "Battle results: you won the pot 🏆" : "Battle results are in — check the feed.");
      } else {
        toast.success("Result locked in. Waiting for your opponent.");
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not submit"),
  });

  function finishQuiz() {
    const qs = quiz.data?.questions ?? [];
    const score = qs.reduce((s, q, i) => s + (answers[i] === q.answer ? 1 : 0), 0);
    submit.mutate({
      score,
      maxScore: qs.length,
      durationSec: Math.round((Date.now() - started.current) / 1000),
      distractions,
    });
  }

  const myBet = bets.find((b) => b.userId === meId);
  const theirBet = bets.find((b) => b.userId !== meId);

  return (
    <div className="space-y-4">
      {/* Header: opponent, mode, status */}
      <div className="ink-card flex flex-wrap items-center gap-4 bg-secondary p-5">
        <Mascot size={64} mood={finished ? (battle.winner_id === meId ? "hype" : "shame") : "smug"} float={active} />
        <div className="min-w-40 flex-1">
          <p className="font-display text-2xl font-extrabold">
            vs {opponent?.display_name ?? opponent?.username ?? "your rival"}
          </p>
          <p className="text-sm font-bold text-muted-foreground">
            <Icon className="mr-1 inline size-4" />
            {battle.modeLabel} · Lv {opponent?.level ?? 1}
          </p>
        </div>
        <span className="ink-border rounded-full bg-card px-3 py-1 text-xs font-extrabold uppercase">
          {battle.status}
        </span>
      </div>

      {/* Meme pot */}
      <div className="ink-card flex flex-wrap items-center gap-4 p-4">
        <p className="font-display text-lg font-extrabold">Meme pot</p>
        {[myBet, theirBet].map((b, i) =>
          b?.meme ? (
            <span key={i} className="flex items-center gap-2">
              <MemeImage slug={b.meme.slug} alt={b.meme.title} className="size-14 rounded-xl" />
              <span className="text-xs font-extrabold uppercase opacity-70">
                {b.userId === meId ? "yours" : "theirs"} · {b.meme.rarity}
                <span className="block normal-case opacity-80">{b.settled ? "settled" : "locked"}</span>
              </span>
            </span>
          ) : null,
        )}
        {!bets.length && <span className="font-bold text-muted-foreground">No bets locked.</span>}
      </div>

      {/* Tasks */}
      <div className="ink-card space-y-2 p-4">
        <p className="font-display text-lg font-extrabold">Battle tasks</p>
        {tasks.map((t) => (
          <p key={t.id} className="text-sm font-bold">
            · {t.title}
            <span className="ml-2 text-xs text-muted-foreground">
              {t.subject ?? "No subject"}
              {t.dueAt ? ` · due ${new Date(t.dueAt).toLocaleDateString()}` : ""}
            </span>
          </p>
        ))}
        {!tasks.length && <p className="font-bold text-muted-foreground">No tasks attached.</p>}
      </div>

      {/* Opponent progress */}
      <div className="ink-card flex flex-wrap items-center gap-4 p-4">
        <p className="font-display text-lg font-extrabold">Opponent progress</p>
        <p className="font-bold text-muted-foreground">
          {theirResult
            ? `Submitted · ${theirResult.max_score ? `${theirResult.score}/${theirResult.max_score}` : clock(theirResult.duration_sec)} · ${theirResult.distractions} distractions`
            : battle.status === "pending"
              ? "Waiting for them to accept the challenge…"
              : "Still grinding — no result yet."}
        </p>
      </div>

      {/* Main stage */}
      {battle.status === "pending" ? (
        <div className="ink-card flex flex-col items-center gap-3 bg-secondary p-8 text-center">
          <Mascot size={100} mood="sleepy" />
          <p className="font-display text-2xl font-extrabold">Waiting for acceptance</p>
          <p className="font-bold text-muted-foreground">
            The battle starts automatically the moment they accept and lock their meme.
          </p>
        </div>
      ) : battle.status === "declined" ? (
        <div className="ink-card flex flex-col items-center gap-3 p-8 text-center">
          <Mascot size={100} mood="shame" />
          <p className="font-display text-2xl font-extrabold">Challenge declined</p>
          <button
            onClick={() => navigate({ to: "/study" })}
            className="ink-border rounded-xl bg-primary px-5 py-2 font-extrabold text-primary-foreground"
          >
            Back to arena
          </button>
        </div>
      ) : finished ? (
        <div className="ink-card flex flex-col items-center gap-3 bg-secondary p-8 text-center">
          <Trophy className="size-8" />
          <p className="font-display text-3xl font-extrabold">
            {battle.winner_id ? (battle.winner_id === meId ? "You won 🏆" : "You lost 💀") : "Draw"}
          </p>
          <p className="font-bold text-muted-foreground">
            {battle.winner_id === meId
              ? "Their meme is yours, plus worms and XP."
              : battle.winner_id
                ? "Your bet meme moved out. Comeback arc starts now."
                : "Both memes stayed home."}
          </p>
          <p className="text-sm font-bold">
            You: {myResult ? (myResult.max_score ? `${myResult.score}/${myResult.max_score}` : clock(myResult.duration_sec)) : "—"} ·
            Them: {theirResult ? (theirResult.max_score ? `${theirResult.score}/${theirResult.max_score}` : clock(theirResult.duration_sec)) : "—"}
          </p>
        </div>
      ) : myResult || phase === "done" ? (
        <div className="ink-card flex flex-col items-center gap-3 bg-secondary p-8 text-center">
          <Mascot size={100} mood="smug" float />
          <p className="font-display text-2xl font-extrabold">Result locked in</p>
          <p className="font-bold text-muted-foreground">
            This screen updates itself the second your opponent submits.
          </p>
        </div>
      ) : phase === "study" ? (
        <div className="ink-card flex flex-col items-center gap-4 bg-secondary p-8">
          <Mascot size={110} mood={distractions ? "shame" : "hype"} float={!distractions} />
          <p className="font-display text-6xl font-extrabold tabular-nums">
            {clock(mode === "set_time" ? Math.max(0, targetSec - elapsed) : elapsed)}
          </p>
          <p className="text-sm font-bold text-muted-foreground">
            {mode === "focus"
              ? "Study longer than your opponent. Don't leave the app."
              : "Study until the timer ends, then the quiz starts automatically."}
          </p>
          {distractions > 0 && (
            <p className="ink-border flex items-center gap-2 rounded-full bg-card px-3 py-1 text-sm font-extrabold text-shame">
              <AlertTriangle className="size-4" /> {distractions} distraction{distractions > 1 ? "s" : ""} · -
              {Math.min(distractions, 3) * 10}% time
            </p>
          )}
          {mode === "focus" ? (
            <button
              onClick={() => submit.mutate({ score: 0, maxScore: 0, durationSec: elapsed, distractions })}
              disabled={submit.isPending}
              className="ink-border rounded-2xl bg-primary px-8 py-4 font-display text-xl font-extrabold text-primary-foreground shadow-ink"
            >
              {submit.isPending ? "Submitting…" : "Tap out & submit"}
            </button>
          ) : (
            <button
              onClick={() => setPhase("quiz")}
              className="ink-border rounded-2xl bg-card px-8 py-4 font-display text-xl font-extrabold shadow-ink"
            >
              Skip to quiz
            </button>
          )}
        </div>
      ) : (
        <div className="ink-card space-y-4 p-5">
          <p className="font-display text-xl font-extrabold">Quiz from your battle tasks</p>
          {quiz.isLoading && <p className="font-bold">อึ่ง is writing questions…</p>}
          {(quiz.data?.questions ?? []).map((q, i) => (
            <div key={i} className="space-y-2">
              <p className="font-extrabold">
                {i + 1}. {q.q}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {q.choices.map((c, ci) => (
                  <button
                    key={ci}
                    onClick={() => setAnswers((a) => ({ ...a, [i]: ci }))}
                    className={cn(
                      "ink-border rounded-xl px-3 py-2 text-left text-sm font-bold",
                      answers[i] === ci ? "bg-primary text-primary-foreground" : "bg-card",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {Boolean(quiz.data?.questions.length) && (
            <button
              onClick={finishQuiz}
              disabled={submit.isPending}
              className="ink-border rounded-2xl bg-primary px-6 py-3 font-display text-lg font-extrabold text-primary-foreground shadow-ink"
            >
              {submit.isPending ? "Submitting…" : "Submit answers"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
