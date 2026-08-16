import champion from "@/assets/memes/ueng-champion.png";
import coffee from "@/assets/memes/ueng-coffee.png";
import deadline from "@/assets/memes/ueng-deadline.png";
import focus from "@/assets/memes/ueng-focus.png";
import genius from "@/assets/memes/ueng-genius.png";
import help from "@/assets/memes/ueng-help.png";
import legend from "@/assets/memes/ueng-legend.png";
import panic from "@/assets/memes/ueng-panic.png";
import party from "@/assets/memes/ueng-party.png";
import sad from "@/assets/memes/ueng-sad.png";
import shame from "@/assets/memes/ueng-shame.png";
import sleepy from "@/assets/memes/ueng-sleepy.png";
import smug from "@/assets/memes/ueng-smug.png";
import streak from "@/assets/memes/ueng-streak.png";
import victory from "@/assets/memes/ueng-victory.png";

export const MEME_IMAGES: Record<string, string> = {
  "ueng-champion": champion,
  "ueng-coffee": coffee,
  "ueng-deadline": deadline,
  "ueng-focus": focus,
  "ueng-genius": genius,
  "ueng-help": help,
  "ueng-legend": legend,
  "ueng-panic": panic,
  "ueng-party": party,
  "ueng-sad": sad,
  "ueng-shame": shame,
  "ueng-sleepy": sleepy,
  "ueng-smug": smug,
  "ueng-streak": streak,
  "ueng-victory": victory,
};

export function memeImage(slug: string | null | undefined) {
  return (slug && MEME_IMAGES[slug]) || MEME_IMAGES["ueng-smug"]!;
}

export * from "@/lib/meme-captions";
