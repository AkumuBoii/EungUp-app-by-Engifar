import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { FeedList } from "@/components/FeedList";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Class feed — EungUp" },
      { name: "description", content: "See your class's study sessions, streak milestones, help requests and shame memes." },
      { property: "og:title", content: "Class feed — EungUp" },
      { property: "og:description", content: "Social accountability inside your class: react, comment and poke slackers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
  return (
    <AppShell>
      <FeedList />
    </AppShell>
  );
}
