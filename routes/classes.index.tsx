import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MyClasses } from "@/components/MyClasses";

export const Route = createFileRoute("/classes/")({
  head: () => ({
    meta: [
      { title: "Your classes — EungUp" },
      {
        name: "description",
        content: "Create a class, share the invite code with friends, or join a class with a code.",
      },
      { property: "og:title", content: "Your classes — EungUp" },
      { property: "og:description", content: "Study together: class feed, class leaderboard and class members." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClassesPage,
});

function ClassesPage() {
  return (
    <AppShell>
      <MyClasses />
    </AppShell>
  );
}
