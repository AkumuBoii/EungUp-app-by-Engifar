import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Swords, Users, ListChecks, Trophy, Flame } from "lucide-react";
import { getClassDashboard, createBattle, respondToBattle, resolveBattle } from "@/lib/memestudy.functions";
import { AppShell } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { useAuth } from "@/hooks/useAuth";
import { setActiveClassId } from "@/hooks/useActiveClass";
import { formatDuration } from "@/lib/gamification";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/classes/$classId")({
  head: () => ({
    meta: [
      { title: "Class hub — EungUp" },
      {
        name: "description",
        content: "One class hub: members, tasks, feed, leaderboard, battles and study statistics.",
      },
      { property: "og:title", content: "Class hub — EungUp" },
      { property: "og:description", content: "Everything your study class does, in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClassHubPage,
});

function ClassHubPage() {
  return (
    <AppShell>
      <ClassHub />
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="ink-border rounded-xl bg-card px-3 py-2">
      <p className="text-[10px] font-extrabold uppercase text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-extrabold">{value}</p>
    </div>
  );
}

function ClassHub() {
  const { classId } = useParams({ from: "/classes/$classId" });
  const qc = useQueryClient();
  const { session, loading } = useAuth();
  const myId = session?.user.id ?? null;

  const load = useServerFn(getClassDashboard);
  const challenge = useServerFn(createBattle);
  const respond = useServerFn(respondToBattle);
  const resolve = useServerFn(resolveBattle);

  const hub = useQuery({
    queryKey: ["class-dashboard", classId, myId],
    queryFn: () => load({ data: { classId } }),
    enabled: Boolean(session) && !loading,
  });

  useEffect(() => {
    setActiveClassId(classId);
  }, [classId]);

  const [opponentId, setOpponentId] = useState("");
  const [targetMin, setTargetMin] = useState(60);
  const [stake, setStake] = useState(50);

  const refresh = () => qc.invalidateQueries({ queryKey: ["class-dashboard", classId] });

  const battleMut = useMutation({
    mutationFn: () =>
      challenge({
        data: { classId, opponentId, mode: "time", targetSec: targetMin * 60, stakeWorms: stake },
      }),
    onSuccess: () => {
      setOpponentId("");
      refresh();
      toast.success("Challenge sent. อึ่ง is cracking knuckles.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not challenge"),
  });

  const respondMut = useMutation({
    mutationFn: (v: { battleId: string; accept: boolean }) => respond({ data: v }),
    onSuccess: () => refresh(),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const resolveMut = useMutation({
    mutationFn: (battleId: string) => resolve({ data: { battleId } }),
    onSuccess: () => {
      refresh();
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Battle settled");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (hub.isLoading) {
    return <p className="ink-card p-8 text-center font-bold">Loading class…</p>;
  }
  if (hub.error) {
    return (
      <div className="ink-card p-8 text-center">
        <p className="font-bold">{hub.error instanceof Error ? hub.error.message : "Could not load class"}</p>
        <Link to="/classes" className="ink-border mt-3 inline-block rounded-xl bg-primary px-4 py-2 font-extrabold text-primary-foreground">
          Back to classes
        </Link>
      </div>
    );
  }

  const data = hub.data!;
  const stats = data.stats;

  return (
    <div className="space-y-5">
      <header className="ink-card flex flex-wrap items-center gap-3 bg-secondary p-5">
        <Mascot size={64} mood="hype" />
        <div className="flex-1">
          <h1 className="font-display text-3xl font-extrabold">{data.klass.name}</h1>
          {data.klass.description && <p className="text-sm font-bold text-muted-foreground">{data.klass.description}</p>}
          <p className="mt-1 text-xs font-extrabold tracking-widest">Invite code: {data.klass.invite_code}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/tasks" className="ink-border rounded-xl bg-card px-3 py-2 text-sm font-extrabold">
            <ListChecks className="mr-1 inline size-4" /> Tasks
          </Link>
          <Link to="/feed" className="ink-border rounded-xl bg-card px-3 py-2 text-sm font-extrabold">
            <Users className="mr-1 inline size-4" /> Feed
          </Link>
          <Link to="/leaderboard" className="ink-border rounded-xl bg-card px-3 py-2 text-sm font-extrabold">
            <Trophy className="mr-1 inline size-4" /> Ranks
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Members" value={String(stats.memberCount)} />
        <Stat label="Class study time" value={formatDuration(stats.totalSec)} />
        <Stat label="Tasks done" value={String(stats.tasksCompleted)} />
        <Stat label="Battles" value={String(stats.totalBattles)} />
        <Stat label="Worms earned" value={`${stats.wormsEarned} 🪱`} />
        <Stat label="Best streak" value={`${stats.bestStreak} 🔥`} />
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <section className="ink-card p-5">
            <h2 className="font-display text-xl font-extrabold">Weekly champions</h2>
            <ol className="mt-3 space-y-2">
              {data.leaderboard.map((row, i) => (
                <li key={row.userId} className={cn("ink-border flex items-center gap-3 rounded-xl bg-card px-3 py-2", i === 0 && "bg-accent")}>
                  <span className="font-display text-lg font-extrabold w-6">{i + 1}</span>
                  <span className="flex-1 font-extrabold">
                    {row.profile?.display_name ?? row.profile?.username ?? "mystery frog"}
                  </span>
                  <span className="font-display font-extrabold">{formatDuration(row.seconds)}</span>
                </li>
              ))}
              {data.leaderboard.length === 0 && (
                <li className="text-sm font-bold text-muted-foreground">No study time this week yet.</li>
              )}
            </ol>
          </section>

          <section className="ink-card p-5">
            <h2 className="font-display text-xl font-extrabold">Upcoming class tasks</h2>
            <ul className="mt-3 space-y-2">
              {data.upcomingTasks.map((task) => (
                <li key={task.id} className="ink-border flex flex-wrap items-center gap-2 rounded-xl bg-card px-3 py-2">
                  <span className="flex-1 font-extrabold">{task.title}</span>
                  <span className="text-xs font-bold text-muted-foreground">
                    @{task.profile?.username ?? "student"} ·{" "}
                    {task.due_at ? new Date(task.due_at).toLocaleDateString() : "no due date"}
                  </span>
                </li>
              ))}
              {data.upcomingTasks.length === 0 && (
                <li className="text-sm font-bold text-muted-foreground">Nothing due. Suspicious.</li>
              )}
            </ul>
          </section>

          <section className="ink-card p-5">
            <h2 className="font-display text-xl font-extrabold">Recent class activity</h2>
            <ul className="mt-3 space-y-2">
              {data.feed.map((post) => (
                <li key={post.id} className="ink-border rounded-xl bg-card px-3 py-2">
                  <p className="text-xs font-extrabold text-muted-foreground">
                    @{post.profile?.username ?? "someone"} · {post.type}
                  </p>
                  <p className="font-bold">{post.body ?? "—"}</p>
                </li>
              ))}
              {data.feed.length === 0 && (
                <li className="text-sm font-bold text-muted-foreground">Quiet class. Start a session.</li>
              )}
            </ul>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="ink-card p-5">
            <h2 className="font-display text-xl font-extrabold">
              <Swords className="mr-1 inline size-5" /> Challenge a classmate
            </h2>
            <select
              value={opponentId}
              onChange={(e) => setOpponentId(e.target.value)}
              className="ink-border mt-3 w-full rounded-xl bg-card px-3 py-2 font-bold"
            >
              <option value="">Pick an opponent</option>
              {data.members
                .filter((m) => m.user_id !== myId)
                .map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.profile?.display_name ?? m.profile?.username ?? "student"}
                  </option>
                ))}
            </select>
            <div className="mt-2 flex gap-2">
              <label className="flex-1 text-xs font-extrabold uppercase text-muted-foreground">
                Minutes
                <input
                  type="number"
                  min={10}
                  value={targetMin}
                  onChange={(e) => setTargetMin(Number(e.target.value))}
                  className="ink-border mt-1 w-full rounded-xl bg-card px-3 py-2 font-bold"
                />
              </label>
              <label className="flex-1 text-xs font-extrabold uppercase text-muted-foreground">
                Stake 🪱
                <input
                  type="number"
                  min={0}
                  value={stake}
                  onChange={(e) => setStake(Number(e.target.value))}
                  className="ink-border mt-1 w-full rounded-xl bg-card px-3 py-2 font-bold"
                />
              </label>
            </div>
            <button
              disabled={!opponentId || battleMut.isPending}
              onClick={() => battleMut.mutate()}
              className="ink-border mt-3 w-full rounded-xl bg-primary px-3 py-2 font-extrabold text-primary-foreground disabled:opacity-50"
            >
              Send challenge
            </button>
          </section>

          <section className="ink-card p-5">
            <h2 className="font-display text-xl font-extrabold">Battles</h2>
            <ul className="mt-3 space-y-2">
              {data.battles.map((b) => (
                <li key={b.id} className="ink-border rounded-xl bg-card px-3 py-2">
                  <p className="text-sm font-extrabold">
                    {b.challenger?.username ?? "?"} vs {b.opponent?.username ?? "?"}
                  </p>
                  <p className="text-xs font-bold text-muted-foreground">
                    {Math.round((b.target_sec ?? 0) / 60)} min · {b.stake_worms} 🪱 · {b.status}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {b.status === "pending" && b.opponent_id === myId && (
                      <>
                        <button
                          onClick={() => respondMut.mutate({ battleId: b.id, accept: true })}
                          className="ink-border rounded-full bg-primary px-3 py-1 text-xs font-extrabold text-primary-foreground"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => respondMut.mutate({ battleId: b.id, accept: false })}
                          className="ink-border rounded-full bg-card px-3 py-1 text-xs font-extrabold"
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {b.status === "active" && (b.challenger_id === myId || b.opponent_id === myId) && (
                      <button
                        onClick={() => resolveMut.mutate(b.id)}
                        className="ink-border rounded-full bg-accent px-3 py-1 text-xs font-extrabold"
                      >
                        Settle
                      </button>
                    )}
                  </div>
                </li>
              ))}
              {data.battles.length === 0 && (
                <li className="text-sm font-bold text-muted-foreground">No battles yet. Someone start beef.</li>
              )}
            </ul>
          </section>

          <section className="ink-card p-5">
            <h2 className="font-display text-xl font-extrabold">Members</h2>
            <ul className="mt-3 space-y-1">
              {data.members.map((m) => (
                <li key={m.user_id} className="flex items-center gap-2 text-sm font-bold">
                  <Mascot size={24} mood="smug" />@{m.profile?.username ?? "student"}
                  {m.role === "owner" && <Flame className="size-3 text-shame" />}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
