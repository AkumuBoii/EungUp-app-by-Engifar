/** Server-only helpers for Battle Mode: playful shame lines and AI quiz generation. */

export type QuizQuestion = {
  q: string;
  choices: string[];
  answer: number;
};

const SHAME_LINES = [
  "{loser} challenged {winner} and got academically folded 💀",
  "{loser} bet a meme and lost it in record time 😭",
  "อึ่ง is disappointed in {loser}, but believes in the comeback arc.",
  "{loser} studied with vibes only. {winner} studied with receipts 📚",
  "{winner} took {loser}'s meme home. Rent free. 🏆",
];

const VICTORY_LINES = [
  "{winner} defeated {loser} in a {mode} and stole a meme 🏆",
  "{winner} out-studied {loser}. อึ่ง approves 🐸",
  "{winner} wins the arena. {loser} gets the character development.",
];

function fill(t: string, winner: string, loser: string, mode: string) {
  return t.replaceAll("{winner}", winner).replaceAll("{loser}", loser).replaceAll("{mode}", mode);
}

export function shameLine(winner: string, loser: string, mode: string) {
  return fill(SHAME_LINES[Math.floor(Math.random() * SHAME_LINES.length)]!, winner, loser, mode);
}

export function victoryLine(winner: string, loser: string, mode: string) {
  return fill(VICTORY_LINES[Math.floor(Math.random() * VICTORY_LINES.length)]!, winner, loser, mode);
}

function fallbackQuiz(topics: string[], size: number): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  for (let i = 0; i < size; i++) {
    const topic = topics[i % Math.max(1, topics.length)] ?? "your study task";
    out.push({
      q: `Recall check ${i + 1}: which statement best describes a key idea from "${topic}"?`,
      choices: [
        "The core concept I reviewed while studying it",
        "Something unrelated to the topic",
        "A random guess",
        "None of the above",
      ],
      answer: 0,
    });
  }
  return out;
}

/** Generate multiple-choice questions from the battle's selected tasks via Lovable AI. */
export async function generateQuiz(topics: string[], size: number): Promise<QuizQuestion[]> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey || topics.length === 0) return fallbackQuiz(topics, size);

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You write short student quizzes. Reply ONLY with JSON: {\"questions\":[{\"q\":string,\"choices\":[4 strings],\"answer\":0-3}]}",
          },
          {
            role: "user",
            content: `Write ${size} multiple-choice questions for a student studying these tasks: ${topics.join("; ")}. Keep them short and factual.`,
          },
        ],
      }),
    });
    if (!res.ok) return fallbackQuiz(topics, size);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return fallbackQuiz(topics, size);
    const parsed = JSON.parse(match[0]) as { questions?: QuizQuestion[] };
    const qs = (parsed.questions ?? []).filter(
      (q) => q && typeof q.q === "string" && Array.isArray(q.choices) && q.choices.length === 4,
    );
    return qs.length ? qs.slice(0, size) : fallbackQuiz(topics, size);
  } catch {
    return fallbackQuiz(topics, size);
  }
}
