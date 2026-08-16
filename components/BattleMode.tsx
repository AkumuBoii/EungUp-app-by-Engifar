import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Swords, Flame, Timer, Brain, Trophy, Check } from "lucide-react";
import {
  getBattleArena,
  createBattleChallenge,
  answerBattleChallenge,
  getBattleLeaderboard,
  type BattleMode as Mode,
} from "@/lib/battles.functions";
import { Mascot } from "@/components/Mascot";
import { MemeImage } from "@/components/MemeCard";
import { useAuth } from "@/hooks/useAuth";
import { useActiveClass } from "@/hooks/useActiveClass";
import { cn } from "@/lib/utils";


const MODES: { key: Mode; label: string; icon: typeof Timer; blurb: string }[] = [
  { key: "set_time", label: "Set Time Battle", icon: Timer, blurb: "Study the clock down, then quiz. Highest score wins." },
  { key: "quiz", label: "Quiz Battle", icon: Brain, blurb: "Straight to the questions. Highest score, fastest time." },
  { key: "focus", label: "Focus Timer Battle", icon: Flame, blurb: "Count up. Last frog focusing wins." },
];

function clock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function BattleMode() {
  const { session } = useAuth();
  const { activeClassId } = useActiveClass();
  const qc = useQueryClient();
  const load = useServerFn(getBattleArena);
  const me = session?.user.id;

  const arena = useQuery({
    queryKey: ["battle-arena", activeClassId, me],
    queryFn: () => load({ data: { classId: activeClassId! } }),
    enabled: Boolean(activeClassId && me),
    refetchInterval: 5_000,
  });

  const [wizard, setWizard] = useState(false);

  const battles = arena.data?.battles ?? [];
  const refresh = () => qc.invalidateQueries({ queryKey: ["battle-arena"] });

  // Auto-join: as soon as a challenge I sent flips to active, jump into the arena.
  const navigate = useNavigate();
  const seenPending = useRef<Set<string>>(new Set());
  const jumped = useRef(false);
  useEffect(() => {
    for (const b of battles) {
      if (b.status === "pending" && b.challenger_id === me) seenPending.current.add(b.id);
      const mine = b.results.some((r) => r.user_id === me);
      if (b.status === "active" && !mine && seenPending.current.has(b.id) && !jumped.current) {
        jumped.current = true;
        seenPending.current.delete(b.id);
        toast.success("Battle started — your challenge was accepted 🐸");
        void navigate({ to: "/battle/$battleId", params: { battleId: b.id } });
      }
    }
  }, [battles, me, navigate]);

  if (!activeClassId) {
    return <p className="ink-card p-5 font-bold">Join a class first — battles happen between classmates.</p>;
  }



  return (
    <div className="space-y-5">
      <div className="ink-card flex flex-wrap items-center gap-4 bg-secondary p-5">
        <Mascot size={72} mood="hype" />
        <div className="min-w-40 flex-1">
          <p className="font-display text-2xl font-extrabold">Battle Mode</p>
          <p className="text-sm font-bold text-muted-foreground">
            Challenge a classmate, wager a meme, study for glory.
          </p>
        </div>
        <button
          onClick={() => setWizard((v) => !v)}
          className="ink-border rounded-2xl bg-primary px-6 py-3 font-display text-lg font-extrabold text-primary-foreground shadow-ink"
        >
          <Swords className="mr-2 inline size-5" />
          {wizard ? "Close" : "Start battle"}
        </button>
      </div>

      {wizard && (
        <ChallengeWizard
          arena={arena.data}
          onDone={() => {
            setWizard(false);
            refresh();
          }}
        />
      )}

      <BattleList battles={battles} meId={me!} arena={arena.data} onChange={refresh} />
      <BattleLeaderboard classId={activeClassId} />
    </div>
  );
}

type Arena = NonNullable<ReturnType<typeof useQuery<Awaited<ReturnType<typeof getBattleArena>>>>["data"]>;

function ChallengeWizard({ arena, onDone }: { arena: Arena | undefined; onDone: () => void }) {
  const { activeClassId } = useActiveClass();
  const create = useServerFn(createBattleChallenge);
  const [step, setStep] = useState(0);
  const [opponentId, setOpponentId] = useState("");
  const [mode, setMode] = useState<Mode>("set_time");
  const [minutes, setMinutes] = useState(30);
  const [quizSize, setQuizSize] = useState(10);
  const [taskIds, setTaskIds] = useState<string[]>([]);
  const [memeId, setMemeId] = useState("");

  const send = useMutation({
    mutationFn: () =>
      create({
        data: {
          classId: activeClassId!,
          opponentId,
          mode,
          targetSec: minutes * 60,
          quizSize,
          taskIds,
          memeId,
        },
      }),
    onSuccess: () => {
      toast.success("Challenge sent. อึ่ง is telling everyone.");
      onDone();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not send challenge"),
  });

  const steps = ["Friend", "Mode", "Tasks", "Meme bet"];
  const canNext = [Boolean(opponentId), true, taskIds.length > 0, Boolean(memeId)][step];

  return (
    <div className="ink-card space-y-4 p-5">
      <div className="flex flex-wrap gap-2">
        {steps.map((s, i) => (
          <span
            key={s}
            className={cn(
              "ink-border rounded-full px-3 py-1 text-xs font-extrabold",
              i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-accent" : "bg-card",
            )}
          >
            {i + 1}. {s}
          </span>
        ))}
      </div>

      {step === 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {(arena?.opponents ?? []).map((o) => (
            <button
              key={o.id}
              onClick={() => setOpponentId(o.id)}
              className={cn(
                "ink-border flex items-center gap-3 rounded-2xl p-3 text-left",
                opponentId === o.id ? "bg-primary text-primary-foreground" : "bg-card",
              )}
            >
              <Mascot size={40} mood="smug" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-extrabold">{o.display_name ?? o.username}</span>
                <span className="block text-xs font-bold opacity-80">
                  🔥 {o.streak} · Lv {o.level} · {o.wins}W
                </span>
              </span>
              <span className={cn("size-3 rounded-full border-2 border-ink", o.online ? "bg-primary" : "bg-muted")} />
            </button>
          ))}
          {!arena?.opponents.length && <p className="font-bold">No classmates yet — invite a friend to your class.</p>}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={cn(
                  "ink-border rounded-2xl p-3 text-left",
                  mode === m.key ? "bg-primary text-primary-foreground" : "bg-card",
                )}
              >
                <m.icon className="mb-1 size-5" />
                <span className="block font-extrabold">{m.label}</span>
                <span className="block text-xs font-bold opacity-80">{m.blurb}</span>
              </button>
            ))}
          </div>
          {mode === "set_time" && (
            <div className="flex flex-wrap gap-2">
              {[15, 30, 45, 60].map((m) => (
                <button
                  key={m}
                  onClick={() => setMinutes(m)}
                  className={cn(
                    "ink-border rounded-full px-4 py-2 text-sm font-extrabold",
                    minutes === m ? "bg-accent" : "bg-card",
                  )}
                >
                  {m} min
                </button>
              ))}
            </div>
          )}
          {mode !== "focus" && (
            <div className="flex flex-wrap gap-2">
              {[10, 20, 30].map((n) => (
                <button
                  key={n}
                  onClick={() => setQuizSize(n)}
                  className={cn(
                    "ink-border rounded-full px-4 py-2 text-sm font-extrabold",
                    quizSize === n ? "bg-accent" : "bg-card",
                  )}
                >
                  {n} questions
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-2">
          {(arena?.tasks ?? []).map((t) => {
            const on = taskIds.includes(t.id);
            return (
              <button
                key={t.id}
                onClick={() => setTaskIds((prev) => (on ? prev.filter((x) => x !== t.id) : [...prev, t.id]))}
                className={cn(
                  "ink-border flex w-full items-center gap-3 rounded-2xl p-3 text-left",
                  on ? "bg-primary text-primary-foreground" : "bg-card",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-extrabold">{t.title}</span>
                  <span className="block text-xs font-bold opacity-80">
                    {t.subject ?? "No subject"} · {t.source} · {t.dueAt ? new Date(t.dueAt).toLocaleDateString() : "no due date"}
                  </span>
                </span>
                {on && <Check className="size-5" />}
              </button>
            );
          })}
          {!arena?.tasks.length && <p className="font-bold">Add a task first — battles are fought over real work.</p>}
        </div>
      )}

      {step === 3 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {(arena?.memes ?? []).map((m) => (
            <button
              key={m.id}
              onClick={() => setMemeId(m.id)}
              className={cn(
                "ink-border rounded-2xl p-2",
                memeId === m.id ? "bg-primary text-primary-foreground" : "bg-card",
              )}
            >
              <MemeImage slug={m.slug} alt={m.title} className="mb-1 aspect-square w-full rounded-xl object-cover" />
              <span className="block truncate text-[11px] font-extrabold">{m.title}</span>
              <span className="block text-[10px] font-bold uppercase opacity-70">{m.rarity}</span>
            </button>
          ))}
          {!arena?.memes.length && <p className="col-span-full font-bold">You own no memes yet — roll the gacha first.</p>}
        </div>
      )}

      <div className="flex justify-between gap-2">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="ink-border rounded-xl bg-card px-4 py-2 font-extrabold disabled:opacity-40"
        >
          Back
        </button>
        {step < 3 ? (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext}
            className="ink-border rounded-xl bg-primary px-5 py-2 font-extrabold text-primary-foreground disabled:opacity-40"
          >
            Next
          </button>
        ) : (
          <button
            onClick={() => send.mutate()}
            disabled={!canNext || send.isPending}
            className="ink-border rounded-xl bg-primary px-5 py-2 font-extrabold text-primary-foreground disabled:opacity-40"
          >
            {send.isPending ? "Sending…" : "Send challenge"}
          </button>
        )}
      </div>
    </div>
  );
}

function BattleList({
  battles,
  meId,
  arena,
  onChange,
}: {
  battles: Arena["battles"];
  meId: string;
  arena: Arena | undefined;
  onChange: () => void;
}) {
  const navigate = useNavigate();
  const answer = useServerFn(answerBattleChallenge);
  const [betFor, setBetFor] = useState<string | null>(null);

  const respond = useMutation({
    mutationFn: (v: { battleId: string; accept: boolean; memeId?: string }) => answer({ data: v }),
    onSuccess: (res) => {
      setBetFor(null);
      onChange();
      if (res.status === "active" && res.battleId) {
        toast.success("Battle started — entering the arena 🐸");
        void navigate({ to: "/battle/$battleId", params: { battleId: res.battleId } });
      } else {
        toast.success("Challenge declined");
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not respond"),
  });

  if (!battles.length) return <p className="ink-card p-5 font-bold">No battles yet. Be the menace who starts one.</p>;

  return (
    <div className="space-y-3">
      {battles.map((b) => {
        const foe = b.challenger_id === meId ? b.opponent : b.challenger;
        const mine = b.results.find((r) => r.user_id === meId);
        const iWon = b.winner_id === meId;
        return (
          <div key={b.id} className="ink-card space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Mascot size={44} mood={b.status === "finished" ? (iWon ? "hype" : "shame") : "smug"} />
              <div className="min-w-40 flex-1">
                <p className="font-display text-lg font-extrabold">
                  vs {foe?.display_name ?? foe?.username ?? "someone"}
                </p>
                <p className="text-xs font-bold text-muted-foreground">
                  {b.modeLabel} · {b.tasks.length} task{b.tasks.length === 1 ? "" : "s"} · pot {b.bets.length} meme
                  {b.bets.length === 1 ? "" : "s"}
                </p>
              </div>
              <span className="ink-border rounded-full bg-secondary px-3 py-1 text-xs font-extrabold uppercase">
                {b.status}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {b.bets.map((bet) => {
                const meme = bet.memes as { slug: string; title: string } | null;
                return meme ? (
                  <MemeImage key={bet.user_id} slug={meme.slug} alt={meme.title} className="size-12 rounded-xl" />
                ) : null;
              })}
            </div>

            {b.status === "pending" && b.opponent_id === meId && (
              <div className="space-y-2">
                {betFor === b.id ? (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {(arena?.memes ?? []).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => respond.mutate({ battleId: b.id, accept: true, memeId: m.id })}
                        className="ink-border rounded-xl bg-card p-1"
                      >
                        <MemeImage slug={m.slug} alt={m.title} className="aspect-square w-full rounded-lg" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setBetFor(b.id)}
                      className="ink-border rounded-xl bg-primary px-4 py-2 font-extrabold text-primary-foreground"
                    >
                      Accept & bet meme
                    </button>
                    <button
                      onClick={() => respond.mutate({ battleId: b.id, accept: false })}
                      className="ink-border rounded-xl bg-card px-4 py-2 font-extrabold"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            )}

            {b.status === "pending" && b.challenger_id === meId && (
              <p className="text-sm font-bold text-muted-foreground">Waiting for them to accept…</p>
            )}

            {b.status === "active" && (
              <button
                onClick={() => navigate({ to: "/battle/$battleId", params: { battleId: b.id } })}
                className="ink-border rounded-xl bg-primary px-4 py-2 font-extrabold text-primary-foreground"
              >
                {mine ? "View battle" : "Enter battle"}
              </button>
            )}

            {b.status === "finished" && (
              <p className="font-extrabold">
                {b.winner_id ? (iWon ? "🏆 You won and stole their meme." : "💀 You lost your bet meme.") : "Draw — memes stay home."}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}


export function BattleLeaderboard({ classId }: { classId: string | null }) {
  const load = useServerFn(getBattleLeaderboard);
  const [scope, setScope] = useState<"class" | "global">("class");
  const rows = useQuery({
    queryKey: ["battle-leaderboard", scope, classId],
    queryFn: () => load({ data: { scope, classId } }),
    enabled: scope === "global" || Boolean(classId),
  });

  return (
    <div className="ink-card space-y-3 p-5">
      <div className="flex items-center gap-2">
        <Trophy className="size-5" />
        <p className="font-display text-lg font-extrabold">Battle leaderboard</p>
        <div className="ml-auto flex gap-2">
          {(["class", "global"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={cn(
                "ink-border rounded-full px-3 py-1 text-xs font-extrabold",
                scope === s ? "bg-primary text-primary-foreground" : "bg-card",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      {(rows.data ?? []).map((r, i) => (
        <div key={r.userId} className="flex items-center gap-3 border-b-2 border-dashed border-ink/20 pb-2 last:border-0">
          <span className="font-display text-lg font-extrabold">{i + 1}</span>
          <span className="min-w-0 flex-1 truncate font-extrabold">
            {r.profile?.display_name ?? r.profile?.username ?? "Frog"}
          </span>
          <span className="text-sm font-bold">
            {r.wins}W · {r.winRate}% · {r.battleXp} XP
          </span>
        </div>
      ))}
      {!rows.data?.length && <p className="font-bold text-muted-foreground">No finished battles yet.</p>}
    </div>
  );
}
