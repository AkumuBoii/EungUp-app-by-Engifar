import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getInventory, equipItem } from "@/lib/memestudy.functions";
import { useAuth } from "@/hooks/useAuth";
import { RARITY_LABEL } from "@/lib/gamification";
import { cn } from "@/lib/utils";
import { rewardImage } from "@/lib/reward-images";

const RARITY_CLASS: Record<string, string> = {
  common: "bg-card",
  rare: "bg-secondary",
  epic: "bg-accent",
  legendary: "bg-primary text-primary-foreground",
};

/** Owned gacha rewards. Pass `kinds` to show only one category. */
export function InventoryGrid({ kinds, emptyLabel }: { kinds?: string[]; emptyLabel?: string }) {
  const { session, loading } = useAuth();
  const qc = useQueryClient();
  const load = useServerFn(getInventory);
  const equip = useServerFn(equipItem);
  const data = useQuery({
    queryKey: ["inventory", session?.user.id],
    queryFn: () => load(),
    enabled: Boolean(session) && !loading,
  });

  const equipMut = useMutation({
    mutationFn: (inventoryId: string) => equip({ data: { inventoryId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Equipped!");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not equip"),
  });

  const items = (data.data?.items ?? []).filter((row) =>
    kinds ? kinds.includes(row.gacha_items?.kind ?? "") : true,
  );

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((row) => {
          const item = row.gacha_items;
          if (!item) return null;
          const equippable = item.kind === "skin" || item.kind === "accessory" || item.kind === "room";
          return (
            <article key={row.id} className={cn("ink-border flex flex-col rounded-xl p-4", RARITY_CLASS[item.rarity])}>
              <img
                src={rewardImage(item)}
                alt={item.name}
                loading="lazy"
                width={512}
                height={512}
                className="ink-border mb-2 aspect-square w-full select-none rounded-xl bg-card object-contain"
              />
              <span className="text-xs font-extrabold uppercase">
                {RARITY_LABEL[item.rarity] ?? item.rarity} · {item.category}
              </span>
              <h3 className="font-display text-lg font-extrabold">{item.name}</h3>
              <p className="flex-1 text-sm opacity-80">{item.description}</p>
              <p className="mt-1 text-xs font-extrabold">×{row.qty}</p>
              {equippable && (
                <button
                  disabled={row.equipped || equipMut.isPending}
                  onClick={() => equipMut.mutate(row.id)}
                  className="ink-border mt-3 rounded-xl bg-card px-3 py-2 text-sm font-extrabold text-foreground disabled:opacity-60"
                >
                  {row.equipped ? "Equipped" : "Equip"}
                </button>
              )}
            </article>
          );
        })}
      </div>

      {data.data && items.length === 0 && (
        <p className="ink-card p-6 text-center text-sm font-bold text-muted-foreground">
          {emptyLabel ?? "Empty. Go roll the gachapon and fill this up."}
        </p>
      )}
    </div>
  );
}
