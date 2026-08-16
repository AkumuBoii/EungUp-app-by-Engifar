import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getLeaderboard } from "@/lib/memestudy.functions";
import { AppShell } from "@/components/AppShell";
import { BattleLeaderboard } from "@/components/BattleMode";
import { Mascot } from "@/components/Mascot";
import { ClassSwitcher, NoClassPrompt } from "@/components/ClassSwitcher";
import { useActiveClass } from "@/hooks/useActiveClass";
import { formatDuration } from "@/lib/gamification";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Class leaderboard — EungUp" },
      { name: "description", content: "Daily, weekly and monthly rankings among the members of your class." },
      { property: "og:title", content: "Class leaderboard — EungUp" },
      { property: "og:description", content: "Study time, worms, streaks and battle wins — ranked inside your class." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LeaderboardPage,
});

type Period = "daily" | "weekly" | "monthly";
type Metric = "time" | "worms" | "streak" | "battles";

const METRICS: { key: Metric; label: string }[] = [
  { key: "time", label: "Study time" },
  { key: "worms", label: "Worms" },
  { key: "streak", label: "Streak" },
  { key: "battles", label: "Battle wins" },
];

function LeaderboardPage() {
  return (
    <AppShell>
      <Leaderboard />
    </AppShell>
  );
}

function formatValue(metric: Metric, value: number) {
  if (metric === "time") return formatDuration(value);
  if (metric === "worms") return `${value} 🪱`;
  if (metric === "streak") return `${value} 🔥`;
  return `${value} W`;
}

function Leaderboard() {
  const [period, setPeriod] = useState<Period>("weekly");
  const [metric, setMetric] = useState<Metric>("time");
  const { activeClass, activeClassId, isLoading } = useActiveClass();
  const load = useServerFn(getLeaderboard);
  const rows = useQuery({
    queryKey: ["leaderboard", period, metric, activeClassId],
    queryFn: () => load({ data: { period, metric, classId: activeClassId } }),
    enabled: Boolean(activeClassId),
  });

  if (!isLoading && !activeClassId) return <NoClassPrompt what="The leaderboard" />;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Mascot size={56} mood="hype" />
        <h1 className="font-display text-3xl font-extrabold">{activeClass?.name ?? "Class"} ranks</h1>
        <ClassSwitcher className="ml-auto" />
      </div>

      <div className="flex gap-2">
        {(["daily", "weekly", "monthly"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "ink-border flex-1 rounded-xl px-3 py-2 text-sm font-extrabold capitalize",
              period === p ? "bg-primary text-primary-foreground" : "bg-card",
            )}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={cn(
              "ink-border rounded-full px-3 py-1.5 text-xs font-extrabold",
              metric === m.key ? "bg-accent" : "bg-card",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <ol className="space-y-2">
        {(rows.data ?? []).map((row, i) => (
          <li
            key={row.userId}
            className={cn("ink-card flex items-center gap-3 p-3", i === 0 && "bg-accent")}
          >
            <span className="font-display text-2xl font-extrabold w-8">{i + 1}</span>
            <Mascot size={40} mood={i === 0 ? "hype" : "smug"} />
            <div className="flex-1">
              <p className="font-extrabold">
                {row.profile?.display_name ?? row.profile?.username ?? "mystery frog"}
              </p>
              <p className="text-xs font-bold text-muted-foreground">level {row.profile?.level ?? 1}</p>
            </div>
            <span className="font-display text-lg font-extrabold">{formatValue(metric, row.value)}</span>
          </li>
        ))}
        {rows.data && rows.data.length === 0 && (
          <li className="ink-card p-6 text-center font-bold">Nothing logged in this class yet. Be the first.</li>
        )}
      </ol>

      <BattleLeaderboard classId={activeClassId} />
    </div>
  );
}

