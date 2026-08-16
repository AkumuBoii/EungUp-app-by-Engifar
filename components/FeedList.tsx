import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { getFeed, reactToPost, commentOnPost, pokeSlacker } from "@/lib/memestudy.functions";
import { MemeCard } from "@/components/MemeCard";
import { memeForPostType, templateBySlug } from "@/lib/meme-captions";
import { Mascot } from "@/components/Mascot";
import { ClassSwitcher, NoClassPrompt } from "@/components/ClassSwitcher";
import { useActiveClass } from "@/hooks/useActiveClass";
import { cn } from "@/lib/utils";

const EMOJIS = ["🔥", "🪱", "😭", "💀", "👏"];

const TYPE_STYLE: Record<string, string> = {
  session: "bg-card",
  milestone: "bg-accent",
  shame: "bg-shame/20",
  help: "bg-secondary",
  task_done: "bg-card",
  battle: "bg-accent",
};


export function FeedList() {
  const qc = useQueryClient();
  const { activeClass, activeClassId, isLoading } = useActiveClass();
  const load = useServerFn(getFeed);
  const react = useServerFn(reactToPost);
  const comment = useServerFn(commentOnPost);
  const poke = useServerFn(pokeSlacker);
  const feed = useQuery({
    queryKey: ["feed", activeClassId],
    queryFn: () => load({ data: { classId: activeClassId } }),
    enabled: Boolean(activeClassId),
  });
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const reactMutation = useMutation({
    mutationFn: (v: { postId: string; emoji: string }) => react({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed"] }),
  });

  const commentMutation = useMutation({
    mutationFn: (v: { postId: string; body: string }) => comment({ data: v }),
    onSuccess: (_r, v) => {
      setDrafts((d) => ({ ...d, [v.postId]: "" }));
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const pokeMutation = useMutation({
    mutationFn: (userId: string) => poke({ data: { toUser: userId } }),
    onSuccess: () => toast.success("Poked. อึ่ง delivered the guilt."),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (!isLoading && !activeClassId) return <NoClassPrompt what="The feed" />;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-extrabold">{activeClass?.name ?? "Class"} feed</h1>
        <ClassSwitcher className="ml-auto" />
      </div>
      {(feed.data ?? []).map((post) => {
        const author = post.author;
        const reactions = (post.reactions ?? []) as { emoji: string }[];
        const comments = (post.comments ?? []) as { id: string; body: string }[];
        return (
          <article key={post.id} className={cn("ink-card p-4", TYPE_STYLE[post.type] ?? "bg-card")}>
            <header className="flex items-center gap-2">
              <Mascot size={38} mood={post.type === "shame" ? "shame" : "smug"} />
              <div className="flex-1">
                <p className="font-extrabold">
                  {author?.display_name ?? author?.username ?? "someone"}{" "}
                  <span className="text-sm font-bold text-muted-foreground">
                    @{author?.username ?? "anon"}
                  </span>
                </p>
                <p className="text-xs font-bold text-muted-foreground">
                  {new Date(post.created_at).toLocaleString()} · {post.type}
                </p>
              </div>
              {post.type === "shame" && (
                <button
                  onClick={() => pokeMutation.mutate(post.user_id)}
                  className="ink-border rounded-full bg-card px-3 py-1 text-xs font-extrabold"
                >
                  Poke
                </button>
              )}
            </header>

            {post.body && <p className="mt-3 font-bold">{post.body}</p>}
            {(() => {
              const payload = (post.payload ?? {}) as { slug?: string; caption?: string };
              const fallback = memeForPostType(post.type, post.body);
              const slug = payload.slug ?? fallback.slug;
              const caption = payload.caption ?? fallback.caption;
              return (
                <MemeCard
                  className="mt-3"
                  slug={slug}
                  caption={caption}
                  title={templateBySlug(slug)?.name}
                  rarity={templateBySlug(slug)?.rarity ?? "common"}
                />
              );
            })()}

            <div className="mt-3 flex flex-wrap gap-2">
              {EMOJIS.map((emoji) => {
                const count = reactions.filter((r) => r.emoji === emoji).length;
                return (
                  <button
                    key={emoji}
                    onClick={() => reactMutation.mutate({ postId: post.id, emoji })}
                    className="ink-border rounded-full bg-card px-3 py-1 text-sm font-extrabold"
                  >
                    {emoji} {count > 0 ? count : ""}
                  </button>
                );
              })}
            </div>

            {comments.length > 0 && (
              <ul className="mt-3 space-y-1 border-t-2 border-ink/20 pt-2">
                {comments.map((c) => (
                  <li key={c.id} className="text-sm font-bold">
                    {c.body}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-2 flex gap-2">
              <input
                value={drafts[post.id] ?? ""}
                onChange={(e) => setDrafts((d) => ({ ...d, [post.id]: e.target.value }))}
                placeholder="say something…"
                className="ink-border w-full rounded-xl bg-card px-3 py-1.5 text-sm font-bold"
              />
              <button
                onClick={() => commentMutation.mutate({ postId: post.id, body: drafts[post.id] ?? "" })}
                className="ink-border rounded-xl bg-primary px-3 py-1.5 text-sm font-extrabold text-primary-foreground"
              >
                Send
              </button>
            </div>
          </article>
        );
      })}
      {feed.data && feed.data.length === 0 && (
        <div className="ink-card flex flex-col items-center gap-2 p-8 text-center">
          <Mascot size={90} mood="sleepy" />
          <p className="font-bold">Nothing here yet. Run a study session to start the noise.</p>
        </div>
      )}
    </div>
  );
}
