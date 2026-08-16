import { Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { memeImage } from "@/lib/meme-templates";
import { cn } from "@/lib/utils";

export const RARITY_RING: Record<string, string> = {
  common: "bg-common/25",
  rare: "bg-rare/25",
  epic: "bg-epic/25",
  legendary: "bg-legendary/30",
};

export function MemeImage({
  slug,
  alt,
  className,
}: {
  slug: string | null | undefined;
  alt: string;
  className?: string | undefined;
}) {
  return (
    <img
      src={memeImage(slug)}
      alt={alt}
      loading="lazy"
      className={cn("aspect-square w-full select-none rounded-xl object-cover", className)}
    />
  );
}

/** Meme as a visual asset: framed image + caption strip + share actions. */
export function MemeCard({
  slug,
  caption,
  title,
  rarity = "common",
  className,
  onClick,
  actions = true,
}: {
  slug: string | null | undefined;
  caption: string;
  title?: string | undefined;
  rarity?: string | undefined;
  className?: string | undefined;
  onClick?: (() => void) | undefined;
  actions?: boolean | undefined;
}) {
  const src = memeImage(slug);

  async function share(e: React.MouseEvent) {
    e.stopPropagation();
    const url = `${window.location.origin}${src}`;
    try {
      if (navigator.share) await navigator.share({ title: title ?? "EungUp", text: caption, url });
      else {
        await navigator.clipboard.writeText(`${caption} — ${url}`);
        toast.success("Meme link copied");
      }
    } catch {
      /* user dismissed */
    }
  }

  function download(e: React.MouseEvent) {
    e.stopPropagation();
    const a = document.createElement("a");
    a.href = src;
    a.download = `${slug ?? "eungup"}.png`;
    a.click();
  }

  return (
    <figure
      onClick={onClick}
      className={cn(
        "ink-border overflow-hidden rounded-2xl bg-card",
        RARITY_RING[rarity] ?? "bg-card",
        onClick && "cursor-pointer transition-transform hover:-rotate-1 hover:scale-[1.01]",
        className,
      )}
    >
      <div className="relative">
        <MemeImage slug={slug} alt={caption} className="rounded-none" />
        <span className="ink-border absolute left-2 top-2 rounded-full bg-card px-2 py-0.5 text-[10px] font-extrabold uppercase">
          {rarity}
        </span>
        {actions && (
          <div className="absolute right-2 top-2 flex gap-1">
            <button
              onClick={share}
              aria-label="Share meme"
              className="ink-border rounded-full bg-card p-1.5"
            >
              <Share2 className="size-3.5" />
            </button>
            <button
              onClick={download}
              aria-label="Download meme"
              className="ink-border rounded-full bg-card p-1.5"
            >
              <Download className="size-3.5" />
            </button>
          </div>
        )}
      </div>
      <figcaption className="border-t-2 border-ink bg-card px-3 py-2 text-sm font-extrabold">
        {caption}
      </figcaption>
    </figure>
  );
}
