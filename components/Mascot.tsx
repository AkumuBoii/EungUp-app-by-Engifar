import mascot from "@/assets/eungup-logo.png.asset.json";
import { cn } from "@/lib/utils";

type Mood = "happy" | "smug" | "shame" | "sleepy" | "hype";

const MOOD_STYLE: Record<Mood, string> = {
  happy: "",
  smug: "-rotate-3",
  shame: "rotate-6 grayscale-[0.5]",
  sleepy: "rotate-2 opacity-70",
  hype: "-rotate-6",
};

export function Mascot({
  size = 96,
  mood = "happy",
  className,
  float = false,
  alt = "อึ่ง, the EungUp frog mascot",
}: {
  size?: number;
  mood?: Mood;
  className?: string;
  float?: boolean;
  alt?: string;
}) {
  return (
    <img
      src={mascot.url}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      className={cn(
        "select-none object-contain drop-shadow-[3px_3px_0_var(--ink)]",
        MOOD_STYLE[mood],
        float && "animate-bounce [animation-duration:2.4s]",
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}

export function MascotBadge({ label, mood = "smug" }: { label: string; mood?: Mood }) {
  return (
    <span className="ink-border inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm font-bold">
      <Mascot size={22} mood={mood} />
      {label}
    </span>
  );
}
