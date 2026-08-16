import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Pencil, LogOut } from "lucide-react";
import { AppShell, useMe } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { useAuth } from "@/hooks/useAuth";
import { useAvatarUrl } from "@/hooks/useAvatarUrl";
import { supabase } from "@/integrations/supabase/client";
import { updateProfile, getProfileStats } from "@/lib/memestudy.functions";
import { getBattleStats } from "@/lib/battles.functions";
import { cn } from "@/lib/utils";
import { MyClasses } from "@/components/MyClasses";
import { InventoryGrid } from "@/components/InventoryGrid";
import { MemeCollection } from "@/components/MemeCollection";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — EungUp" },
      { name: "description", content: "Your EungUp hub: classes, collection, inventory, character and stats." },
      { property: "og:title", content: "Your profile — EungUp" },
      { property: "og:description", content: "Manage your EungUp profile, avatar and display name." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <AppShell>
      <ProfileHub />
    </AppShell>
  );
}

function useStats() {
  const { session, loading } = useAuth();
  const load = useServerFn(getProfileStats);
  return useQuery({
    queryKey: ["profile-stats", session?.user.id],
    queryFn: () => load(),
    enabled: Boolean(session) && !loading,
  });
}

function formatHours(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return `${h}h ${m}m`;
}

function AccountCard() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const me = useMe();
  const qc = useQueryClient();
  const save = useServerFn(updateProfile);
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (me.data?.profile?.display_name) setDisplayName(me.data.profile.display_name);
  }, [me.data?.profile?.display_name]);

  const avatarUrl = useAvatarUrl(me.data?.profile?.avatar_url);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !session?.user.id) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${session.user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (uploadError) throw new Error(uploadError.message);

      await save({ data: { avatarUrl: path } });
      await qc.invalidateQueries({ queryKey: ["me", session.user.id] });
      toast.success("Profile picture updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function saveDisplayName() {
    const trimmed = displayName.trim();
    if (!trimmed) return;
    try {
      await save({ data: { displayName: trimmed } });
      await qc.invalidateQueries({ queryKey: ["me", session?.user.id] });
      setEditingName(false);
      toast.success("Display name saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center">
      <div className="ink-card w-full p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className={cn(
                "ink-border relative overflow-hidden rounded-full bg-secondary p-1 transition-transform hover:scale-105",
                uploading && "opacity-60",
              )}
              aria-label="Change profile picture"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="size-32 rounded-full object-cover" />
              ) : (
                <Mascot size={128} mood="smug" />
              )}
              <span className="absolute bottom-1 right-1 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-ink-sm">
                <Pencil className="size-4" />
              </span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          <h2 className="font-display text-2xl font-extrabold">Account Info</h2>

          <div className="w-full space-y-1">
            <label className="text-sm font-extrabold text-muted-foreground">Username</label>
            <div className="ink-border w-full rounded-xl bg-muted px-4 py-3 text-center font-bold text-muted-foreground">
              {me.data?.profile?.username ?? "—"}
            </div>
          </div>

          <div className="w-full space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-extrabold text-muted-foreground">Display name</label>
              {!editingName && (
                <button
                  onClick={() => setEditingName(true)}
                  className="flex items-center gap-1 text-xs font-extrabold text-primary"
                >
                  <Pencil className="size-3" /> Edit
                </button>
              )}
            </div>
            {editingName ? (
              <div className="flex gap-2">
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="ink-border flex-1 rounded-xl bg-card px-4 py-3 font-bold"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveDisplayName();
                    if (e.key === "Escape") {
                      setEditingName(false);
                      setDisplayName(me.data?.profile?.display_name ?? "");
                    }
                  }}
                />
                <button
                  onClick={saveDisplayName}
                  className="ink-border rounded-xl bg-primary px-4 font-extrabold text-primary-foreground shadow-ink-sm"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="ink-border w-full rounded-xl bg-card px-4 py-3 text-center font-display text-xl font-extrabold">
                {me.data?.profile?.display_name ?? "—"}
              </div>
            )}
          </div>

          <button
            onClick={signOut}
            className="ink-border mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-destructive px-6 py-3 font-display text-lg font-extrabold text-destructive-foreground shadow-ink hover:bg-destructive/90"
          >
            <LogOut className="size-5" />
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "classes", label: "My Classes" },
  { id: "collection", label: "Collection" },
  { id: "inventory", label: "Inventory" },
  { id: "character", label: "Character" },
  { id: "stats", label: "Statistics" },
  { id: "settings", label: "Settings" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function ProfileHub() {
  const [tab, setTab] = useState<TabId>("overview");
  const me = useMe();
  const stats = useStats();
  const profile = me.data?.profile;
  const avatarUrl = useAvatarUrl(profile?.avatar_url);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "ink-border rounded-full px-4 py-1.5 text-sm font-extrabold",
              tab === t.id ? "bg-primary text-primary-foreground" : "bg-card",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          <section className="ink-card flex flex-col items-center gap-4 p-6 sm:flex-row sm:items-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Your avatar"
                className="ink-border size-24 rounded-full bg-secondary object-cover"
              />
            ) : (
              <Mascot size={96} mood="smug" />
            )}
            <div className="text-center sm:text-left">
              <h1 className="font-display text-3xl font-extrabold">{profile?.display_name ?? "อึ่ง friend"}</h1>
              <p className="font-bold text-muted-foreground">@{profile?.username ?? "—"}</p>
              <p className="mt-1 text-sm font-bold">
                Level {profile?.level ?? 1} ·{" "}
                {(me.data?.streak?.current ?? 0) > 0 ? "On a streak 🔥" : "Warming up"}
              </p>
            </div>
          </section>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatChip label="Worms" value={`🪱 ${profile?.worms ?? 0}`} />
            <StatChip label="Streak" value={`🔥 ${me.data?.streak?.current ?? 0} days`} />
            <StatChip
              label="Joined"
              value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}
            />
            <StatChip label="Study time" value={formatHours(stats.data?.totalSec ?? 0)} />
          </div>

          <AccountCard />

          <div className="mx-auto flex max-w-md flex-wrap justify-center gap-2">
            <Link to="/gacha" className="ink-border rounded-xl bg-accent px-4 py-2 font-extrabold">
              Gacha & Collection
            </Link>
            <Link to="/study" className="ink-border rounded-xl bg-card px-4 py-2 font-extrabold">
              Start studying
            </Link>
          </div>
        </div>
      )}

      {tab === "classes" && <MyClasses />}

      {tab === "collection" && (
        <section className="space-y-4">
          <MemeCollection />
          <div className="space-y-3">
            <h2 className="font-display text-2xl font-extrabold">Skins, rooms & collectibles</h2>
            <InventoryGrid
              kinds={["skin", "room", "theme", "collectible"]}
              emptyLabel="No skins or room themes yet — roll the gachapon."
            />
          </div>
        </section>
      )}

      {tab === "inventory" && (
        <section className="space-y-3">
          <h2 className="font-display text-2xl font-extrabold">Inventory</h2>
          <p className="text-sm font-bold text-muted-foreground">
            Power-ups, decorations, consumables and special rewards.
          </p>
          <InventoryGrid />
        </section>
      )}

      {tab === "character" && (
        <section className="space-y-4">
          <div className="ink-card flex flex-col items-center gap-3 p-6">
            <h2 className="font-display text-2xl font-extrabold">Current character</h2>
            <Mascot size={140} mood="smug" float />
            <p className="text-sm font-bold text-muted-foreground">
              Skin: {profile?.mascot_skin ?? "classic"}
            </p>
          </div>
          <h3 className="font-display text-xl font-extrabold">Skins, accessories & backgrounds</h3>
          <InventoryGrid
            kinds={["skin", "accessory", "room", "theme"]}
            emptyLabel="Nothing to equip yet — win skins and accessories from the gachapon."
          />
        </section>
      )}

      {tab === "stats" && (
        <section className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatChip label="Total study" value={formatHours(stats.data?.totalSec ?? 0)} />
            <StatChip label="Sessions" value={`${stats.data?.sessionCount ?? 0}`} />
            <StatChip label="Tasks completed" value={`${stats.data?.tasksCompleted ?? 0}`} />
            <StatChip label="Current streak" value={`${me.data?.streak?.current ?? 0} days`} />
            <StatChip label="Longest streak" value={`${me.data?.streak?.longest ?? 0} days`} />
            <StatChip label="Level" value={`⭐ ${profile?.level ?? 1}`} />
            <StatChip label="XP" value={`${profile?.xp ?? 0}`} />
            <StatChip label="Worms" value={`🪱 ${profile?.worms ?? 0}`} />
          </div>
          <BattleStatsPanel />
        </section>
      )}


      {tab === "settings" && <SettingsPanel />}
    </div>
  );
}

function SettingsPanel() {
  const me = useMe();
  const qc = useQueryClient();
  const { session } = useAuth();
  const save = useServerFn(updateProfile);
  const [goal, setGoal] = useState<number | null>(null);

  const dailyGoal = goal ?? me.data?.profile?.daily_goal_min ?? 60;

  async function saveGoal() {
    try {
      await save({ data: { dailyGoalMin: dailyGoal } });
      await qc.invalidateQueries({ queryKey: ["me", session?.user.id] });
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <section className="ink-card space-y-3 p-6">
        <h2 className="font-display text-2xl font-extrabold">Study settings</h2>
        <label className="block text-sm font-extrabold text-muted-foreground">Daily goal (minutes)</label>
        <input
          type="number"
          min={10}
          max={720}
          value={dailyGoal}
          onChange={(e) => setGoal(Number(e.target.value))}
          className="ink-border w-full rounded-xl bg-card px-4 py-3 font-bold"
        />
        <button
          onClick={saveGoal}
          className="ink-border w-full rounded-xl bg-primary px-4 py-2 font-extrabold text-primary-foreground shadow-ink-sm"
        >
          Save
        </button>
      </section>

      <AccountCard />
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="ink-card p-4 text-center">
      <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-extrabold">{value}</p>
    </div>
  );
}

/** Battle Mode statistics for the signed-in player. */
function BattleStatsPanel() {
  const { session } = useAuth();
  const load = useServerFn(getBattleStats);
  const stats = useQuery({
    queryKey: ["battle-stats", session?.user.id],
    queryFn: () => load(),
    enabled: Boolean(session),
  });
  const s = stats.data;
  return (
    <div className="space-y-3">
      <p className="font-display text-lg font-extrabold">Battle Mode</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatChip label="Total battles" value={`${s?.total ?? 0}`} />
        <StatChip label="Wins" value={`${s?.wins ?? 0}`} />
        <StatChip label="Losses" value={`${s?.losses ?? 0}`} />
        <StatChip label="Win rate" value={`${s?.winRate ?? 0}%`} />
        <StatChip label="Worms earned" value={`🪱 ${s?.wormsEarned ?? 0}`} />
        <StatChip label="Memes won" value={`${s?.memesWon ?? 0}`} />
        <StatChip label="Longest focus battle" value={formatHours(s?.longestFocusSec ?? 0)} />
        <StatChip label="Highest quiz score" value={`${s?.highestQuizScore ?? 0}`} />
      </div>
    </div>
  );
}
