import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Flame, Timer, ListChecks, Trophy } from "lucide-react";
import { getDashboard } from "@/lib/memestudy.functions";
import { AppShell, useMe } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { FeedList } from "@/components/FeedList";
import { useActiveClass } from "@/hooks/useActiveClass";
import { formatDuration, xpForLevel } from "@/lib/gamification";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Home — EungUp" },
      { name: "description", content: "Your class feed, daily goal, streak, worms and tasks due — all in one place." },
      { property: "og:title", content: "Home — EungUp" },
      { property: "og:description", content: "Social study hub: class activity, streaks, worms and today's tasks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <AppShell>
      <Home />
    </AppShell>
  );
}

function Home() {
  const me = useMe();
  const fetchDash = useServerFn(getDashboard);
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchDash() });
  const { classes, activeClassId, setActive } = useActiveClass();

  const profile = me.data?.profile;
  const today = me.data?.today;
  const total = today?.total_sec ?? 0;
  const goal = today?.goal_sec ?? 3600;
  const pct = Math.min(100, Math.round((total / Math.max(goal, 1)) * 100));
  const level = profile?.level ?? 1;
  const xp = profile?.xp ?? 0;
  const xpPct = Math.min(100, Math.round((xp / xpForLevel(level)) * 100));

  const tasks = dash.data?.tasks ?? [];
  const now = new Date();
  const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
  const upcoming = tasks.filter((t) => t.due_at && new Date(t.due_at) < endOfTomorrow);

  return (
    <div className="space-y-6">
      <section className="ink-card flex flex-col items-center gap-5 bg-secondary p-6 md:flex-row">
        <Mascot size={110} mood={pct >= 100 ? "hype" : pct > 0 ? "smug" : "sleepy"} float={pct >= 100} />
        <div className="flex-1">
          <h1 className="font-display text-3xl font-extrabold">
            {pct >= 100 ? "Goal smashed!" : `สู้ๆ, ${profile?.display_name ?? "friend"}`}
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatDuration(total)} of {formatDuration(goal)} today · level {level}
          </p>
          <div className="ink-border mt-3 h-5 w-full overflow-hidden rounded-full bg-card p-0">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-mint-deep" style={{ width: `${xpPct}%` }} />
          </div>
        </div>
        <Link
          to="/study"
          className="ink-border rounded-2xl bg-primary px-6 py-4 font-display text-xl font-extrabold text-primary-foreground shadow-ink"
        >
          Start studying
        </Link>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<Timer className="size-5" />} label="Daily goal" value={`${pct}%`} />
        <Stat icon={<Flame className="size-5 text-shame" />} label="Streak" value={`${me.data?.streak?.current ?? 0} days`} />
        <Stat icon={<span className="text-lg">🪱</span>} label="Worms" value={String(profile?.worms ?? 0)} />
        <Stat icon={<Trophy className="size-5" />} label="Level" value={String(level)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <FeedList />
        </div>

        <aside className="space-y-4">
          <section className="ink-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-extrabold">Due soon</h2>
              <Link to="/tasks" className="text-sm font-bold underline">
                all tasks
              </Link>
            </div>
            <ul className="mt-3 space-y-2">
              {upcoming.slice(0, 5).map((task) => (
                <li key={task.id} className="ink-border flex items-center justify-between gap-2 rounded-xl bg-card px-3 py-2">
                  <span className="truncate font-bold">{task.title}</span>
                  <span className="shrink-0 text-xs font-bold text-muted-foreground">
                    {task.due_at ? new Date(task.due_at).toLocaleDateString() : "no date"}
                  </span>
                </li>
              ))}
              {dash.data && upcoming.length === 0 && (
                <li className="text-sm text-muted-foreground">
                  <ListChecks className="mb-1 inline size-4" /> Nothing due today or tomorrow.
                </li>
              )}
            </ul>
          </section>

          <section className="ink-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-extrabold">Your classes</h2>
              <Link to="/profile" className="text-sm font-bold underline">
                manage
              </Link>
            </div>
            <ul className="mt-3 space-y-2">
              {classes.map((klass) => (
                <li key={klass.id}>
                  <Link
                    to="/classes/$classId"
                    params={{ classId: klass.id }}
                    onClick={() => setActive(klass.id)}
                    className={cn(
                      "ink-border flex items-center justify-between rounded-xl px-3 py-2 font-extrabold",
                      klass.id === activeClassId ? "bg-secondary" : "bg-card",
                    )}
                  >
                    <span className="truncate">{klass.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{klass.members.length} 👥</span>
                  </Link>
                </li>
              ))}
              {classes.length === 0 && (
                <li className="text-sm font-bold text-muted-foreground">
                  No class yet —{" "}
                  <Link to="/profile" className="underline">
                    create or join one
                  </Link>
                  .
                </li>
              )}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="ink-card flex items-center gap-3 p-4">
      {icon}
      <div>
        <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
        <p className="font-display text-2xl font-extrabold">{value}</p>
      </div>
    </div>
  );
}
