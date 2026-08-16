/**
 * Meme template library (server-safe: metadata only, no image imports).
 * Image files live in src/lib/meme-templates.ts, keyed by the same slug.
 */

export type MemeCategory = "success" | "study" | "shame" | "help" | "deadline" | "celebration";

export type MemeTemplate = {
  slug: string;
  name: string;
  category: MemeCategory;
  rarity: "common" | "rare" | "epic" | "legendary";
};

export const MEME_TEMPLATES: MemeTemplate[] = [
  { slug: "ueng-focus", name: "Focused อึ่ง", category: "study", rarity: "common" },
  { slug: "ueng-smug", name: "Smug อึ่ง", category: "success", rarity: "common" },
  { slug: "ueng-panic", name: "Panic อึ่ง", category: "deadline", rarity: "common" },
  { slug: "ueng-sleepy", name: "Sleepy อึ่ง", category: "study", rarity: "common" },
  { slug: "ueng-coffee", name: "Caffeinated อึ่ง", category: "study", rarity: "rare" },
  { slug: "ueng-genius", name: "Galaxy Brain อึ่ง", category: "success", rarity: "rare" },
  { slug: "ueng-shame", name: "Shame อึ่ง", category: "shame", rarity: "rare" },
  { slug: "ueng-sad", name: "Sad อึ่ง", category: "shame", rarity: "rare" },
  { slug: "ueng-help", name: "Confused อึ่ง", category: "help", rarity: "common" },
  { slug: "ueng-deadline", name: "This Is Fine อึ่ง", category: "deadline", rarity: "rare" },
  { slug: "ueng-victory", name: "Gigachad อึ่ง", category: "celebration", rarity: "epic" },
  { slug: "ueng-party", name: "Party อึ่ง", category: "celebration", rarity: "epic" },
  { slug: "ueng-champion", name: "Champion อึ่ง", category: "celebration", rarity: "epic" },
  { slug: "ueng-streak", name: "Streak Lord อึ่ง", category: "success", rarity: "epic" },
  { slug: "ueng-legend", name: "Legendary อึ่ง", category: "celebration", rarity: "legendary" },
];

export function templateBySlug(slug: string | null | undefined) {
  return MEME_TEMPLATES.find((t) => t.slug === slug) ?? null;
}

export function templatesByCategory(category: MemeCategory) {
  return MEME_TEMPLATES.filter((t) => t.category === category);
}

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

export type MemeStamp = { slug: string; template: string; caption: string };

function stamp(slug: string, caption: string): MemeStamp {
  return { slug, template: templateBySlug(slug)?.name ?? slug, caption };
}

/** Study session finished. */
export function sessionMeme(name: string, subject: string, minutes: number): MemeStamp {
  if (minutes >= 120)
    return stamp(
      pick(["ueng-genius", "ueng-victory", "ueng-streak"]),
      pick([
        `${name} locked in on ${subject} for ${minutes} minutes. Absolute unit.`,
        `${minutes} minutes of ${subject}. The brain has grown a second floor.`,
      ]),
    );
  if (minutes >= 45)
    return stamp(
      pick(["ueng-smug", "ueng-focus", "ueng-coffee"]),
      pick([
        `${name} survived ${minutes} minutes of ${subject}. Miracles do happen.`,
        `${subject} for ${minutes} minutes — no phone, no crying, mostly.`,
      ]),
    );
  return stamp(
    pick(["ueng-focus", "ueng-sleepy"]),
    pick([
      `${name} studied ${subject} for ${minutes} minutes. It counts. Barely.`,
      `${minutes} minutes of ${subject}. Small worm, still a worm.`,
    ]),
  );
}

/** Streak milestone. */
export function milestoneMeme(name: string, days: number): MemeStamp {
  const slug = days >= 100 ? "ueng-legend" : days >= 30 ? "ueng-champion" : "ueng-streak";
  return stamp(slug, `${name} hit a ${days}-day streak. The fire is real.`);
}

/** Anti-cheat strikes / slacking. */
export function shameMeme(name: string, strikes: number): MemeStamp {
  return stamp(
    pick(["ueng-shame", "ueng-sad"]),
    pick([
      `${name} tab-switched ${strikes} times. อึ่ง saw everything.`,
      `${strikes} strikes. The phone won this round, ${name}.`,
    ]),
  );
}

/** Task completed. */
export function taskDoneMeme(name: string, title: string): MemeStamp {
  return stamp(
    pick(["ueng-smug", "ueng-victory", "ueng-party"]),
    pick([
      `${name} finished "${title}" before the deadline. Miracles do happen.`,
      `"${title}" — done. ${name} may now touch grass.`,
    ]),
  );
}

/** Help request. */
export function helpMeme(name: string, title: string): MemeStamp {
  return stamp("ueng-help", `${name} has no idea what is happening in "${title}". Send help.`);
}

/** Due-date panic. */
export function deadlineMeme(name: string, title: string): MemeStamp {
  return stamp(
    pick(["ueng-deadline", "ueng-panic"]),
    `"${title}" is due soon and ${name} is very calm about it. This is fine.`,
  );
}

/** Battle results. */
export function battleWinMeme(name: string): MemeStamp {
  return stamp(pick(["ueng-victory", "ueng-champion"]), `${name} won the study battle. Sigma grindset confirmed.`);
}

export function battleLossMeme(name: string): MemeStamp {
  return stamp(pick(["ueng-sad", "ueng-help"]), `${name} lost the battle but kept the dignity. Mostly.`);
}

/** Weekly champion + monthly wrapped. */
export function weeklyChampionMeme(name: string, hours: number): MemeStamp {
  return stamp("ueng-champion", `${name} is this week's champion with ${hours}h studied. Bow down.`);
}

export function wrappedMeme(name: string, hours: number, sessions: number): MemeStamp {
  return stamp("ueng-party", `${name}'s month: ${hours}h across ${sessions} sessions. Wrapped and packed.`);
}

/** Fallback used when a post has no stored meme (older posts). */
export function memeForPostType(type: string, body: string | null): MemeStamp {
  const text = body ?? "";
  switch (type) {
    case "milestone":
      return stamp("ueng-streak", text || "Streak milestone unlocked.");
    case "shame":
      return stamp("ueng-shame", text || "อึ่ง disapproves.");
    case "help":
      return stamp("ueng-help", text || "Send help.");
    case "task_done":
      return stamp("ueng-smug", text || "Task destroyed.");
    case "battle":
      return stamp("ueng-victory", text || "Battle time.");
    case "leaderboard":
      return stamp("ueng-champion", text || "Leaderboard shakeup.");
    default:
      return stamp("ueng-focus", text || "Study session logged.");
  }
}
