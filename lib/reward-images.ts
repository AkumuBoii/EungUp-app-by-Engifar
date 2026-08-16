import skinClassic from "@/assets/rewards/skin-classic.png";
import skinHype from "@/assets/rewards/skin-hype.png";
import skinSleepy from "@/assets/rewards/skin-sleepy.png";
import skinVoid from "@/assets/rewards/skin-void.png";
import skinGolden from "@/assets/rewards/skin-golden.png";
import hatCap from "@/assets/rewards/hat-cap.png";
import hatGrad from "@/assets/rewards/hat-grad.png";
import hatCrown from "@/assets/rewards/hat-crown.png";
import glassesNerd from "@/assets/rewards/glasses-nerd.png";
import glassesDeal from "@/assets/rewards/glasses-deal.png";
import outfitHoodie from "@/assets/rewards/outfit-hoodie.png";
import outfitLab from "@/assets/rewards/outfit-lab.png";
import themeMint from "@/assets/rewards/theme-mint.png";
import themeNight from "@/assets/rewards/theme-night.png";
import themeSwamp from "@/assets/rewards/theme-swamp.png";
import themeSpace from "@/assets/rewards/theme-space.png";
import furnitureLamp from "@/assets/rewards/furniture-lamp.png";
import furnitureDesk from "@/assets/rewards/furniture-desk.png";
import furnitureChair from "@/assets/rewards/furniture-chair.png";
import decorationPoster from "@/assets/rewards/decoration-poster.png";
import decorationPlant from "@/assets/rewards/decoration-plant.png";
import decorationTrophy from "@/assets/rewards/decoration-trophy.png";
import powerShameShield from "@/assets/rewards/power-shame_shield.png";
import powerStreakFreeze from "@/assets/rewards/power-streak_freeze.png";
import powerDoubleWorms from "@/assets/rewards/power-double_worms.png";

export const REWARD_IMAGES: Record<string, string> = {
  "skin-classic": skinClassic,
  "skin-hype": skinHype,
  "skin-sleepy": skinSleepy,
  "skin-void": skinVoid,
  "skin-golden": skinGolden,
  "hat-cap": hatCap,
  "hat-grad": hatGrad,
  "hat-crown": hatCrown,
  "glasses-nerd": glassesNerd,
  "glasses-deal": glassesDeal,
  "outfit-hoodie": outfitHoodie,
  "outfit-lab": outfitLab,
  "theme-mint": themeMint,
  "theme-night": themeNight,
  "theme-swamp": themeSwamp,
  "theme-space": themeSpace,
  "furniture-lamp": furnitureLamp,
  "furniture-desk": furnitureDesk,
  "furniture-chair": furnitureChair,
  "decoration-poster": decorationPoster,
  "decoration-plant": decorationPlant,
  "decoration-trophy": decorationTrophy,
  "power-shame_shield": powerShameShield,
  "power-streak_freeze": powerStreakFreeze,
  "power-double_worms": powerDoubleWorms,
};

const FALLBACK: Record<string, string> = {
  character: skinClassic,
  room: themeMint,
  power: powerDoubleWorms,
};

/** Resolve the artwork for a gacha reward from its kind + payload. */
export function rewardImage(item: {
  kind?: string | null;
  category?: string | null;
  payload?: unknown;
}) {
  const kind = item.kind ?? "";
  const payload = (item.payload ?? {}) as Record<string, unknown>;
  const value = payload[kind] ?? payload["effect"];
  const key = `${kind}-${String(value ?? "")}`;
  return REWARD_IMAGES[key] ?? FALLBACK[item.category ?? ""] ?? skinClassic;
}
