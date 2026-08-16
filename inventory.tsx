import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Mascot } from "@/components/Mascot";
import { InventoryGrid } from "@/components/InventoryGrid";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — EungUp" },
      { name: "description", content: "Everything you pulled from the gachapon: skins, accessories, themes and power-ups." },
      { property: "og:title", content: "Inventory — EungUp" },
      { property: "og:description", content: "Equip your อึ่ง skin, hats and study room themes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Mascot size={56} mood="smug" />
          <h1 className="font-display text-3xl font-extrabold">Inventory</h1>
        </div>
        <InventoryGrid />
      </div>
    </AppShell>
  );
}
