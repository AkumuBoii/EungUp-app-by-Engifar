export const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";

export const RARITY_TABLE = [
  { rarity: "common" as const, weight: 60 },
  { rarity: "rare" as const, weight: 25 },
  { rarity: "epic" as const, weight: 12 },
  { rarity: "legendary" as const, weight: 3 },
];

export const STREAK_MILESTONES = [3, 7, 14, 30, 100];

export function levelFromXp(xp: number) {
  let level = 1;
  while (xp >= Math.round(100 * Math.pow(level, 1.5))) level += 1;
  return level;
}

export function xpForLevel(level: number) {
  return Math.round(100 * Math.pow(level, 1.5));
}

/** Strikes shave 10% of validated time each (max 30%). */
export function validatedSeconds(rawSeconds: number, strikes: number) {
  const penalty = Math.min(strikes, 3) * 0.1;
  return Math.max(0, Math.floor(rawSeconds * (1 - penalty)));
}

export function wormsFor(
  seconds: number,
  opts: { goalMet: boolean; streak: number; booster: boolean },
) {
  const base = Math.floor(seconds / 60 / 5);
  const streakMult = Math.min(1 + opts.streak * 0.05, 2);
  const goalMult = opts.goalMet ? 1.2 : 1;
  const boost = opts.booster ? 2 : 1;
  return Math.min(Math.floor(base * streakMult * goalMult * boost), 400);
}

export function pickRarity(random: number) {
  const total = RARITY_TABLE.reduce((sum, r) => sum + r.weight, 0);
  let roll = random * total;
  for (const entry of RARITY_TABLE) {
    roll -= entry.weight;
    if (roll <= 0) return entry.rarity;
  }
  return "common" as const;
}

export function localDay(timezone: string, at: Date = new Date()) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(at);
  } catch {
    return at.toISOString().slice(0, 10);
  }
}

export function isNextDay(previous: string | null, today: string) {
  if (!previous) return false;
  const prev = new Date(previous + "T00:00:00Z").getTime();
  const cur = new Date(today + "T00:00:00Z").getTime();
  return cur - prev === 86400000;
}

export function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/* ---------------- Gachapon ---------------- */

export const GACHA_TABLE = [
  { rarity: "common" as const, weight: 60 },
  { rarity: "rare" as const, weight: 25 },
  { rarity: "epic" as const, weight: 10 },
  { rarity: "legendary" as const, weight: 5 },
];

export const ROLL_COST = 100;
export const TEN_ROLL_COST = 900;
export const PITY_EPIC = 20;
export const PITY_LEGENDARY = 50;

export const RARITY_LABEL: Record<string, string> = {
  common: "Common",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

export function pickGachaRarity(random: number) {
  const total = GACHA_TABLE.reduce((sum, r) => sum + r.weight, 0);
  let roll = random * total;
  for (const entry of GACHA_TABLE) {
    roll -= entry.weight;
    if (roll <= 0) return entry.rarity;
  }
  return "common" as const;
}

const RARITY_ORDER = ["common", "rare", "epic", "legendary"] as const;
export type Rarity = (typeof RARITY_ORDER)[number];
export function rarityAtLeast(rarity: string, floor: Rarity) {
  return RARITY_ORDER.indexOf(rarity as Rarity) >= RARITY_ORDER.indexOf(floor);
}

/** BIO-8X4K style invite code derived from the class name. */
export function makeInviteCode(className: string) {
  const letters = className.replace(/[^a-zA-Z]/g, "").toUpperCase();
  const prefix = (letters.slice(0, 3) || "CLS").padEnd(3, "X");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 4; i += 1) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `${prefix}-${suffix}`;
}
