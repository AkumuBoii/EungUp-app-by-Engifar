import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Heart, Lock } from "lucide-react";
import { getCollection } from "@/lib/memestudy.functions";
import { Mascot } from "@/components/Mascot";
import { MemeCard, MemeImage, RARITY_RING } from "@/components/MemeCard";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const FILTERS = ["all", "owned", "locked", "favorites"] as const;
type Filter = (typeof FILTERS)[number];

type Meme = {
  id: string;
  slug: string;
  title: string;
  caption: string | null;
  rarity: string;
};

export function MemeCollection() {
  const load = useServerFn(getCollection);
  const data = useQuery({ queryKey: ["collection"], queryFn: () => load() });
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<Meme | null>(null);
  const [favs, setFavs] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(window.localStorage.getItem("meme-favs") ?? "[]") as string[];
    } catch {
      return [];
    }
  });

  const owned = data.data?.owned ?? [];
  const ownedIds = useMemo(() => new Set(owned.map((o) => o.meme_id)), [owned]);
  const catalog = (data.data?.catalog ?? []) as Meme[];

  function toggleFav(id: string) {
    setFavs((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      window.localStorage.setItem("meme-favs", JSON.stringify(next));
      return next;
    });
  }

  const shown = catalog.filter((m) => {
    if (filter === "owned") return ownedIds.has(m.id);
    if (filter === "locked") return !ownedIds.has(m.id);
    if (filter === "favorites") return favs.includes(m.id);
    return true;
  });

  const obtained = (id: string) => owned.find((o) => o.meme_id === id);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Mascot size={56} mood="smug" />
        <div>
          <h1 className="font-display text-3xl font-extrabold">Meme collection</h1>
          <p className="text-sm font-bold text-muted-foreground">
            {ownedIds.size} / {catalog.length} unlocked
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "ink-border rounded-full px-3 py-1 text-xs font-extrabold uppercase",
              filter === f ? "bg-primary text-primary-foreground" : "bg-card",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {shown.map((meme) => {
          const isOwned = ownedIds.has(meme.id);
          return (
            <article
              key={meme.id}
              onClick={() => isOwned && setOpen(meme)}
              className={cn(
                "ink-border overflow-hidden rounded-2xl",
                RARITY_RING[meme.rarity] ?? "bg-card",
                isOwned ? "cursor-pointer transition-transform hover:-rotate-1" : "",
              )}
            >
              <div className="relative">
                <MemeImage
                  slug={meme.slug}
                  alt={isOwned ? meme.title : "Locked meme"}
                  className={cn("rounded-none", !isOwned && "blur-md grayscale")}
                />
                <span className="ink-border absolute left-2 top-2 rounded-full bg-card px-2 py-0.5 text-[10px] font-extrabold uppercase">
                  {meme.rarity}
                </span>
                {isOwned ? (
                  <button
                    aria-label="Favourite meme"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFav(meme.id);
                    }}
                    className="ink-border absolute right-2 top-2 rounded-full bg-card p-1.5"
                  >
                    <Heart className={cn("size-3.5", favs.includes(meme.id) && "fill-shame text-shame")} />
                  </button>
                ) : (
                  <span className="ink-border absolute right-2 top-2 rounded-full bg-card p-1.5">
                    <Lock className="size-3.5" />
                  </span>
                )}
              </div>
              <div className="border-t-2 border-ink bg-card px-3 py-2">
                <h2 className="font-display text-sm font-extrabold">{isOwned ? meme.title : "???"}</h2>
                <p className="truncate text-xs font-bold text-muted-foreground">
                  {isOwned ? meme.caption : "Keep studying to unlock"}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      <Dialog open={Boolean(open)} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="ink-card max-w-md">
          {open && (
            <div className="space-y-3">
              <MemeCard slug={open.slug} caption={open.caption ?? open.title} title={open.title} rarity={open.rarity} />
              <div>
                <h3 className="font-display text-xl font-extrabold">{open.title}</h3>
                <p className="text-sm font-bold text-muted-foreground">
                  {open.rarity} · from {obtained(open.id)?.source ?? "drop"} ·{" "}
                  {obtained(open.id)?.obtained_at
                    ? new Date(obtained(open.id)!.obtained_at).toLocaleDateString()
                    : "—"}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
