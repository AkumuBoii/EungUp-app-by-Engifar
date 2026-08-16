export type BattleMode = "set_time" | "quiz" | "focus";

export const MODE_LABEL: Record<string, string> = {
  set_time: "Set Time Battle",
  quiz: "Quiz Battle",
  focus: "Focus Timer Battle",
};

export const WIN_WORMS = 60;
export const WIN_XP = 40;
