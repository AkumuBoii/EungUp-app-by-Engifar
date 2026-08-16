import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getGacha, rollGacha } from "@/lib/memestudy.functions";
import { AppShell } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { MemeCard } from "@/components/MemeCard";
import { useAuth } from "@/hooks/useAuth";
import { ROLL_COST, TEN_ROLL_COST, PITY_EPIC, PITY_LEGENDARY, RARITY_LABEL } from "@/lib/gamification";
import { rewardImage } from "@/lib/reward-images";
import { MemeCollection } from "@/components/MemeCollection";
import { InventoryGrid } from "@/components/InventoryGrid";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/gacha")({
  head: () => ({
    meta: [
      { title: "Gacha & Collection — EungUp" },
      {
        name: "description",
        content: "Spend worms on the อึ่ง gachapon for skins, accessories, room themes, memes and power-ups.",
      },
      { property: "og:title", content: "Gachapon — EungUp" },
      { property: "og:description", content: "Roll the capsule machine: guaranteed epic at 20 rolls, legendary at 50." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GachaPage,
});

const RARITY_CLASS: Record<string, string> = {
  common: "bg-card",
  rare: "bg-secondary",
  epic: "bg-accent",
  legendary: "bg-primary text-primary-foreground",
};

function GachaPage() {
  return (
    <AppShell>
      <Gacha />
    </AppShell>
  );
}

type Pull = {
  name: string;
  rarity: string;
  category: string;
  description: string | null;
  pityHit: boolean;
  isMeme: boolean;
  slug: string | null;
  kind: string;
  payload: Record<string, string | number>;
};


function Gacha() {
  const { session, loading } = useAuth();
  const qc = useQueryClient();
  const load = useServerFn(getGacha);
  const roll = useServerFn(rollGacha);
  const data = useQuery({ queryKey: ["gacha", session?.user.id], queryFn: () => load(), enabled: Boolean(session) && !loading });
  const [pulls, setPulls] = useState<Pull[]>([]);

  const rollMut = useMutation({
    mutationFn: (count: 1 | 10) => roll({ data: { count } }),
    onSuccess: (res) => {
      setPulls(res.results);
      qc.invalidateQueries({ queryKey: ["gacha"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["collection"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      const best = res.results.find((r) => r.rarity === "legendary") ?? res.results.find((r) => r.rarity === "epic");
      toast.success(best ? `${RARITY_LABEL[best.rarity] ?? best.rarity}! ${best.name}` : "Capsules opened!");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Roll failed"),
  });

  const worms = data.data?.worms ?? 0;
  const pityEpic = data.data?.pityEpic ?? 0;
  const pityLegendary = data.data?.pityLegendary ?? 0;

  return (
    <div className="space-y-6">
      <section className="ink-card flex flex-col items-center gap-5 bg-secondary p-6 md:flex-row">
        <Mascot size={110} mood="hype" float />
        <div className="flex-1">
          <h1 className="font-display text-3xl font-extrabold">อึ่ง Gacha & Collection</h1>
          <p className="text-sm font-bold text-muted-foreground">
            🪱 {worms} worms · {data.data?.totalRolls ?? 0} lifetime rolls
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <PityBar label={`Epic in ${Math.max(0, PITY_EPIC - pityEpic)}`} value={pityEpic} max={PITY_EPIC} />
            <PityBar
              label={`Legendary in ${Math.max(0, PITY_LEGENDARY - pityLegendary)}`}
              value={pityLegendary}
              max={PITY_LEGENDARY}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button
            disabled={worms < ROLL_COST || rollMut.isPending}
            onClick={() => rollMut.mutate(1)}
            className="ink-border rounded-2xl bg-primary px-6 py-4 font-display text-xl font-extrabold text-primary-foreground shadow-ink disabled:opacity-50"
          >
            Roll ×1 · 🪱 {ROLL_COST}
          </button>
          <button
            disabled={worms < TEN_ROLL_COST || rollMut.isPending}
            onClick={() => rollMut.mutate(10)}
            className="ink-border rounded-2xl bg-card px-6 py-3 font-display text-lg font-extrabold shadow-ink-sm disabled:opacity-50"
          >
            Roll ×10 · 🪱 {TEN_ROLL_COST}
          </button>
        </div>
      </section>

      {pulls.length > 0 && (
        <section className="ink-card p-5">
          <h2 className="font-display text-xl font-extrabold">You pulled</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pulls.map((p, i) => (
              <div
                key={`${p.name}-${i}`}
                className={cn(
                  "ink-border animate-in fade-in zoom-in-95 rounded-xl p-4 duration-500",
                  RARITY_CLASS[p.rarity],
                )}
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <p className="text-xs font-extrabold uppercase">
                  {RARITY_LABEL[p.rarity] ?? p.rarity} · {p.category}
                  {p.pityHit ? " · pity" : ""}
                </p>
                <p className="font-display text-lg font-extrabold">{p.name}</p>
                {p.isMeme ? (
                  <MemeCard
                    className="mt-2"
                    slug={p.slug}
                    caption={p.description ?? p.name}
                    title={p.name}
                    rarity={p.rarity}
                  />
                ) : (
                  <>
                    <img
                      src={rewardImage(p)}
                      alt={p.name}
                      loading="lazy"
                      width={512}
                      height={512}
                      className="ink-border mt-2 aspect-square w-full select-none rounded-xl bg-card object-contain"
                    />
                    {p.description && <p className="mt-2 text-sm opacity-80">{p.description}</p>}
                  </>
                )}

              </div>
            ))}
          </div>
        </section>
      )}

      <CollectionSection />


      <section className="ink-card p-5">
        <h2 className="font-display text-xl font-extrabold">Prize pool</h2>
        <p className="text-sm font-bold text-muted-foreground">Everything อึ่ง can spit out of the capsule machine.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data.data?.pool ?? []).map((item) => (
            <article
              key={item.id}
              className="ink-border flex flex-col overflow-hidden rounded-2xl bg-card transition-transform hover:-rotate-1 hover:scale-[1.01]"
            >
              <div className={cn("relative border-b-2 border-ink p-3", RARITY_CLASS[item.rarity])}>
                <img
                  src={rewardImage(item)}
                  alt={item.name}
                  loading="lazy"
                  width={512}
                  height={512}
                  className="aspect-square w-full select-none rounded-xl bg-card object-contain"
                />
                <span className="ink-border absolute left-4 top-4 rounded-full bg-card px-2 py-0.5 text-[10px] font-extrabold uppercase text-foreground">
                  {RARITY_LABEL[item.rarity] ?? item.rarity}
                </span>
                <span className="ink-border absolute right-4 top-4 rounded-full bg-card px-2 py-0.5 text-[10px] font-extrabold uppercase text-foreground">
                  {item.category}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3">
                <h3 className="font-display text-lg font-extrabold leading-tight">{item.name}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>


      <section className="ink-card p-5">
        <h2 className="font-display text-xl font-extrabold">Recent pulls</h2>
        <ul className="mt-3 space-y-2">
          {(data.data?.history ?? []).map((h) => (
            <li key={h.id} className="ink-border flex items-center justify-between rounded-xl bg-card px-3 py-2">
              <span className="font-bold">{h.name}</span>
              <span className="text-xs font-extrabold uppercase text-muted-foreground">
                {RARITY_LABEL[h.rarity] ?? h.rarity}
              </span>
            </li>
          ))}
          {data.data && data.data.history.length === 0 && (
            <li className="text-sm text-muted-foreground">No pulls yet. อึ่ง is holding the capsules hostage.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function PityBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div>
      <p className="text-xs font-extrabold uppercase text-muted-foreground">{label}</p>
      <div className="ink-border mt-1 h-4 overflow-hidden rounded-full bg-card">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const COLLECTION_TABS = [
  { id: "memes", label: "Memes" },
  { id: "skins", label: "Character Skins" },
  { id: "room", label: "Room Items" },
  { id: "power", label: "Power Ups" },
] as const;

function CollectionSection() {
  const [tab, setTab] = useState<(typeof COLLECTION_TABS)[number]["id"]>("memes");

  return (
    <section className="ink-card p-5">
      <h2 className="font-display text-xl font-extrabold">Collection</h2>
      <p className="text-sm font-bold text-muted-foreground">Everything you own — favourite it, equip it, flex it.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {COLLECTION_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "ink-border rounded-full px-3 py-1 text-xs font-extrabold uppercase",
              tab === t.id ? "bg-primary text-primary-foreground" : "bg-card",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {tab === "memes" && <MemeCollection />}
        {tab === "skins" && <InventoryGrid kinds={["skin", "accessory"]} emptyLabel="No skins yet — roll for อึ่ง fits." />}
        {tab === "room" && <InventoryGrid kinds={["room", "furniture"]} emptyLabel="No room items yet." />}
        {tab === "power" && <InventoryGrid kinds={["power", "powerup", "boost", "consumable"]} emptyLabel="No power ups yet." />}
      </div>
    </section>
  );
}
