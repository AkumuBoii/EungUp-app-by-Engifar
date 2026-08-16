import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Flame, Home, Timer, ListChecks, Trophy } from "lucide-react";
import { getMe } from "@/lib/memestudy.functions";
import { useAuth } from "@/hooks/useAuth";
import { useAvatarUrl } from "@/hooks/useAvatarUrl";
import { Mascot } from "@/components/Mascot";
import { ClassSwitcher } from "@/components/ClassSwitcher";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/study", label: "Study", icon: Timer },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/gacha", label: "Gacha", icon: Flame },
  { to: "/leaderboard", label: "Ranks", icon: Trophy },
] as const;


export function useMe() {
  const fetchMe = useServerFn(getMe);
  const { session, loading } = useAuth();
  return useQuery({
    queryKey: ["me", session?.user.id],
    queryFn: () => fetchMe(),
    enabled: Boolean(session) && !loading,
    staleTime: 10_000,
  });
}

function ProfileButton() {
  const me = useMe();
  const avatarUrl = useAvatarUrl(me.data?.profile?.avatar_url);

  return (
    <Link
      to="/profile"
      className="ink-border relative overflow-hidden rounded-full bg-secondary p-0.5 transition-transform hover:scale-105"
      aria-label="Go to profile"
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="Profile" className="size-9 rounded-full object-cover" />
      ) : (
        <Mascot size={36} mood="smug" />
      )}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const me = useMe();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  useEffect(() => {
    if (me.data && !me.data.profile?.onboarded && pathname !== "/onboarding") {
      navigate({ to: "/onboarding" });
    }
  }, [me.data, pathname, navigate]);

  if (loading || (session && me.isLoading)) {
    return (
      <div className="paper flex min-h-screen flex-col items-center justify-center gap-4">
        <Mascot size={110} float />
        <p className="font-display text-lg">อึ่ง is waking up…</p>
      </div>
    );
  }

  const profile = me.data?.profile;

  return (
    <div className="paper min-h-screen pb-24 md:pb-10">
      <header className="sticky top-0 z-30 border-b-[3px] border-ink bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Mascot size={40} mood="smug" />
            <span className="font-display text-xl font-extrabold">EungUp</span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-bold transition-colors",
                  pathname === item.to
                    ? "ink-border bg-primary text-primary-foreground"
                    : "hover:bg-secondary",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ClassSwitcher className="hidden sm:flex" />
            <span className="ink-border flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-sm font-extrabold">
              🪱 {profile?.worms ?? 0}
            </span>
            <span className="ink-border flex items-center gap-1 rounded-full bg-card px-3 py-1 text-sm font-extrabold">
              <Flame className="size-4 text-shame" /> {me.data?.streak?.current ?? 0}
            </span>
            <ProfileButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t-[3px] border-ink bg-background md:hidden">
        <div className="flex items-center justify-between px-2 py-1.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-bold",
                  pathname === item.to ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
