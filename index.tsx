import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Trophy, Sparkles, Users, Timer, Skull } from "lucide-react";
import { Mascot } from "@/components/Mascot";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EungUp — Study Streaks, Worms & Meme Rewards" },
      {
        name: "description",
        content:
          "EungUp turns studying into a social game: track focus sessions, build streaks, earn worms, collect memes and roast your friends with อึ่ง.",
      },
      { property: "og:title", content: "EungUp — Study Streaks, Worms & Meme Rewards" },
      {
        property: "og:description",
        content:
          "Focus timers, daily goals, class leaderboards and meme rewards. Study consistently with friends and อึ่ง the frog.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Timer, title: "Focus timers", body: "Stopwatch, countdown and task-focus modes that catch you tab-switching." },
  { icon: Flame, title: "Daily goal streaks", body: "Hit your minutes, keep the flame, earn streak-freeze insurance." },
  { icon: Sparkles, title: "Meme drops", body: "Milestones roll common → legendary memes into your collection." },
  { icon: Users, title: "Social feed", body: "Sessions, wins and help requests land in your class feed." },
  { icon: Trophy, title: "Leaderboards", body: "Daily, weekly and monthly ranks across your friends and classes." },
  { icon: Skull, title: "Playful shame", body: "Slack off and อึ่ง posts a shame meme with your name on it." },
];

function Landing() {
  return (
    <div className="paper min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <Mascot size={44} mood="smug" />
          <span className="font-display text-2xl font-extrabold">EungUp</span>
        </div>
        <Link
          to="/auth"
          className="ink-border rounded-full bg-primary px-5 py-2 font-display font-extrabold text-primary-foreground shadow-ink-sm"
        >
          Start studying
        </Link>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 md:grid-cols-2 md:py-16">
        <div>
          <span className="ink-border inline-block rounded-full bg-accent px-3 py-1 text-sm font-bold">
            เรียนกับอึ่ง · study with the frog
          </span>
          <h1 className="mt-4 font-display text-5xl font-extrabold leading-[1.05] md:text-6xl">
            Study consistently.
            <br />
            Get rewarded in <span className="text-mint-deep">worms</span>.
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">
            EungUp is Google Classroom × Duolingo × study tracker × meme feed. Track real focus time,
            keep your streak alive, and let your friends roast you when you slack.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="ink-border rounded-2xl bg-primary px-6 py-3 font-display text-lg font-extrabold text-primary-foreground shadow-ink"
            >
              Create your อึ่ง
            </Link>
            <Link
              to="/leaderboard"
              className="ink-border rounded-2xl bg-card px-6 py-3 font-display text-lg font-extrabold shadow-ink-sm"
            >
              See the ranks
            </Link>
          </div>
        </div>

        <div className="ink-card relative flex items-center justify-center bg-secondary p-8">
          <Mascot size={260} float />
          <span className="ink-border absolute right-4 top-4 rounded-full bg-card px-3 py-1 text-sm font-extrabold">
            🔥 12-day streak
          </span>
          <span className="ink-border absolute bottom-4 left-4 rounded-full bg-accent px-3 py-1 text-sm font-extrabold">
            🪱 +48 worms
          </span>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="font-display text-3xl font-extrabold">How it hooks you</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <article key={f.title} className="ink-card p-5">
                <Icon className="size-7" />
                <h3 className="mt-3 font-display text-xl font-extrabold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="border-t-[3px] border-ink py-6 text-center text-sm font-bold">
        EungUp · อึ่ง is watching your study time 👀
      </footer>
    </div>
  );
}
