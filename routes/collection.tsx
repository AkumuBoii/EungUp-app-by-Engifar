import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MemeCollection } from "@/components/MemeCollection";

export const Route = createFileRoute("/collection")({
  head: () => ({
    meta: [
      { title: "Meme collection — EungUp" },
      { name: "description", content: "Your collected meme trophies, from common to legendary, earned by studying." },
      { property: "og:title", content: "Meme collection — EungUp" },
      { property: "og:description", content: "Collect meme trophies by hitting streak milestones and opening packs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CollectionPage,
});

function CollectionPage() {
  return (
    <AppShell>
      <MemeCollection />
    </AppShell>
  );
}
