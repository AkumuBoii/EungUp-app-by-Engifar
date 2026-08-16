import { Link } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { useActiveClass } from "@/hooks/useActiveClass";
import { cn } from "@/lib/utils";

/** Picks the active class; every class-scoped page follows this selection. */
export function ClassSwitcher({ className }: { className?: string }) {
  const { classes, activeClassId, setActive } = useActiveClass();

  if (!classes.length) {
    return (
      <Link
        to="/classes"
        className={cn(
          "ink-border flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-sm font-extrabold",
          className,
        )}
      >
        <GraduationCap className="size-4" /> Join a class
      </Link>
    );
  }

  return (
    <label className={cn("flex items-center gap-2", className)}>
      <span className="sr-only">Active class</span>
      <select
        value={activeClassId ?? ""}
        onChange={(e) => setActive(e.target.value)}
        className="ink-border max-w-[180px] truncate rounded-full bg-card px-3 py-1.5 text-sm font-extrabold"
      >
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Empty state shown by class-scoped pages when the user has no class yet. */
export function NoClassPrompt({ what }: { what: string }) {
  return (
    <div className="ink-card space-y-2 p-8 text-center">
      <h2 className="font-display text-2xl font-extrabold">No class yet</h2>
      <p className="text-sm font-bold text-muted-foreground">
        {what} lives inside a class. Create one or join with an invite code.
      </p>
      <Link
        to="/classes"
        className="ink-border mt-2 inline-block rounded-xl bg-primary px-4 py-2 font-extrabold text-primary-foreground"
      >
        Go to classes
      </Link>
    </div>
  );
}
