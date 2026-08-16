import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EMPTY_UUID } from "@/lib/gamification";
import { MODE_LABEL, WIN_WORMS, WIN_XP, type BattleMode } from "@/lib/battle-constants";

export type { BattleMode };

/** Everything the Battle Mode arena needs for one class. */
export const getBattleArena = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { classId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: members } = await supabase
      .from("class_members")
      .select("user_id")
      .eq("class_id", data.classId);
    const memberIds = (members ?? []).map((m) => m.user_id);
    if (!memberIds.includes(userId)) throw new Error("You are not a member of this class");

    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const [profilesRes, streaksRes, onlineRes, winsRes, tasksRes, memesRes, battlesRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, username, display_name, avatar_url, mascot_skin, level")
        .in("id", memberIds),
      supabaseAdmin.from("streaks").select("user_id, current").in("user_id", memberIds),
      supabaseAdmin
        .from("study_sessions")
        .select("user_id, started_at")
        .in("user_id", memberIds)
        .gte("started_at", since),
      supabaseAdmin.from("battles").select("winner_id").in("winner_id", memberIds),
      supabase
        .from("tasks")
        .select("id, title, status, due_at, class_id, user_id, subjects(name, color)")
        .or(`user_id.eq.${userId},class_id.eq.${data.classId}`)
        .neq("status", "done")
        .limit(60),
      supabase.from("user_memes").select("meme_id, memes(id, slug, title, rarity)").eq("user_id", userId),
      supabase
        .from("battles")
        .select("*")
        .eq("class_id", data.classId)
        .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const profiles = profilesRes.data ?? [];
    const battles = battlesRes.data ?? [];
    const battleIds = battles.map((b) => b.id);

    const [betsRes, resultsRes, btasksRes] = await Promise.all([
      supabase.from("battle_bets").select("battle_id, user_id, meme_id, memes(slug, title, rarity)").in("battle_id", battleIds.length ? battleIds : [EMPTY_UUID]),
      supabase.from("battle_results").select("*").in("battle_id", battleIds.length ? battleIds : [EMPTY_UUID]),
      supabase.from("battle_tasks").select("battle_id, task_id, tasks(title)").in("battle_id", battleIds.length ? battleIds : [EMPTY_UUID]),
    ]);

    const wins = new Map<string, number>();
    for (const w of winsRes.data ?? []) if (w.winner_id) wins.set(w.winner_id, (wins.get(w.winner_id) ?? 0) + 1);

    const opponents = profiles
      .filter((p) => p.id !== userId)
      .map((p) => ({
        ...p,
        streak: (streaksRes.data ?? []).find((s) => s.user_id === p.id)?.current ?? 0,
        online: (onlineRes.data ?? []).some((s) => s.user_id === p.id),
        wins: wins.get(p.id) ?? 0,
      }))
      .sort((a, b) => Number(b.online) - Number(a.online) || b.wins - a.wins);

    return {
      opponents,
      tasks: (tasksRes.data ?? []).map((t) => ({
        id: t.id,
        title: t.title,
        dueAt: t.due_at,
        source: t.class_id === data.classId && t.user_id !== userId ? "class" : t.class_id ? "class" : "personal",
        subject: (t.subjects as { name: string; color: string } | null)?.name ?? null,
      })),
      memes: (memesRes.data ?? [])
        .map((m) => m.memes as { id: string; slug: string; title: string; rarity: string } | null)
        .filter((m): m is { id: string; slug: string; title: string; rarity: string } => Boolean(m)),
      battles: battles.map((b) => ({
        ...b,
        modeLabel: MODE_LABEL[b.mode] ?? b.mode,
        challenger: profiles.find((p) => p.id === b.challenger_id) ?? null,
        opponent: profiles.find((p) => p.id === b.opponent_id) ?? null,
        bets: (betsRes.data ?? []).filter((x) => x.battle_id === b.id),
        results: (resultsRes.data ?? []).filter((x) => x.battle_id === b.id),
        tasks: (btasksRes.data ?? []).filter((x) => x.battle_id === b.id),
      })),
    };
  });

export const createBattleChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      classId: string;
      opponentId: string;
      mode: BattleMode;
      targetSec: number;
      quizSize: number;
      taskIds: string[];
      memeId: string;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.opponentId === userId) throw new Error("Pick someone other than yourself");
    if (!data.taskIds.length) throw new Error("Pick at least one task");
    if (!data.memeId) throw new Error("You must wager a meme");

    const { data: owns } = await supabase
      .from("user_memes")
      .select("id")
      .eq("user_id", userId)
      .eq("meme_id", data.memeId)
      .maybeSingle();
    if (!owns) throw new Error("You do not own that meme");

    const { data: battle, error } = await supabase
      .from("battles")
      .insert({
        class_id: data.classId,
        challenger_id: userId,
        opponent_id: data.opponentId,
        mode: data.mode,
        target_sec: data.mode === "focus" ? 0 : Math.max(0, Math.min(28800, data.targetSec)),
        quiz_size: Math.max(5, Math.min(30, data.quizSize)),
        stake_worms: WIN_WORMS,
        status: "pending",
        ends_at: new Date(Date.now() + 2 * 86400000).toISOString(),
      })
      .select("*")
      .single();
    if (error || !battle) throw new Error(error?.message ?? "Could not create battle");

    await supabase.from("battle_tasks").insert(data.taskIds.map((id) => ({ battle_id: battle.id, task_id: id })));
    await supabase.from("battle_bets").insert({ battle_id: battle.id, user_id: userId, meme_id: data.memeId });

    await supabase.from("posts").insert({
      user_id: userId,
      class_id: data.classId,
      type: "battle",
      body: `threw down a ${MODE_LABEL[data.mode]} challenge 🥊`,
      payload: { battleId: battle.id, stage: "challenge", mode: data.mode },
    });

    return { ok: true, battleId: battle.id };
  });

export const answerBattleChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { battleId: string; accept: boolean; memeId?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: battle } = await supabase.from("battles").select("*").eq("id", data.battleId).maybeSingle();
    if (!battle) throw new Error("Battle not found");
    if (battle.opponent_id !== userId) throw new Error("Only the challenged player can answer");
    if (battle.status !== "pending") throw new Error("This battle is no longer pending");

    if (!data.accept) {
      await supabase.from("battles").update({ status: "declined" }).eq("id", battle.id);
      return { ok: true, status: "declined" as const, battleId: battle.id };
    }

    if (!data.memeId) throw new Error("Wager a meme to accept");
    const { data: owns } = await supabase
      .from("user_memes")
      .select("id")
      .eq("user_id", userId)
      .eq("meme_id", data.memeId)
      .maybeSingle();
    if (!owns) throw new Error("You do not own that meme");

    await supabase.from("battle_bets").insert({ battle_id: battle.id, user_id: userId, meme_id: data.memeId });
    const { data: updated, error: upErr } = await supabase
      .from("battles")
      .update({ status: "active", started_at: new Date().toISOString() })
      .eq("id", battle.id)
      .select("id, status")
      .maybeSingle();
    if (upErr) throw new Error(upErr.message);
    if (!updated || updated.status !== "active") throw new Error("Could not start the battle. Try again.");

    await supabase.from("posts").insert({
      user_id: userId,
      class_id: battle.class_id,
      type: "battle",
      body: `accepted a ${MODE_LABEL[battle.mode] ?? battle.mode}. Both memes are in the pot 🍲`,
      payload: { battleId: battle.id, stage: "accepted", mode: battle.mode },
    });

    return { ok: true, status: "active" as const, battleId: battle.id, mode: battle.mode as BattleMode };
  });

/** Full state of one battle for the dedicated battle screen. */
export const getBattleRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { battleId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: battle } = await supabase.from("battles").select("*").eq("id", data.battleId).maybeSingle();
    if (!battle) throw new Error("Battle not found");
    if (battle.challenger_id !== userId && battle.opponent_id !== userId)
      throw new Error("You are not in this battle");

    const [profilesRes, tasksRes, betsRes, resultsRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, username, display_name, avatar_url, mascot_skin, level")
        .in("id", [battle.challenger_id, battle.opponent_id]),
      supabase.from("battle_tasks").select("task_id, tasks(title, due_at, subjects(name))").eq("battle_id", battle.id),
      supabase.from("battle_bets").select("user_id, meme_id, settled, memes(slug, title, rarity)").eq("battle_id", battle.id),
      supabase.from("battle_results").select("*").eq("battle_id", battle.id),
    ]);

    const profiles = profilesRes.data ?? [];
    return {
      battle: { ...battle, modeLabel: MODE_LABEL[battle.mode] ?? battle.mode },
      meId: userId,
      me: profiles.find((p) => p.id === userId) ?? null,
      opponent: profiles.find((p) => p.id !== userId) ?? null,
      tasks: (tasksRes.data ?? []).map((t) => {
        const task = t.tasks as { title: string; due_at: string | null; subjects: { name: string } | null } | null;
        return {
          id: t.task_id,
          title: task?.title ?? "Task",
          dueAt: task?.due_at ?? null,
          subject: task?.subjects?.name ?? null,
        };
      }),
      bets: (betsRes.data ?? []).map((b) => ({
        userId: b.user_id,
        settled: b.settled,
        meme: b.memes as { slug: string; title: string; rarity: string } | null,
      })),
      results: resultsRes.data ?? [],
    };
  });


/** Quiz questions generated from the battle's selected tasks. */
export const getBattleQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { battleId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: battle } = await supabase.from("battles").select("*").eq("id", data.battleId).maybeSingle();
    if (!battle) throw new Error("Battle not found");
    if (battle.challenger_id !== userId && battle.opponent_id !== userId)
      throw new Error("You are not in this battle");

    const { data: rows } = await supabase
      .from("battle_tasks")
      .select("tasks(title, description)")
      .eq("battle_id", battle.id);
    const topics = (rows ?? [])
      .map((r) => r.tasks as { title: string; description: string | null } | null)
      .filter(Boolean)
      .map((t) => `${t!.title}${t!.description ? ` — ${t!.description}` : ""}`);

    const { generateQuiz } = await import("@/lib/battles.server");
    const questions = await generateQuiz(topics, battle.quiz_size ?? 10);
    return { questions };
  });

export const submitBattleResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { battleId: string; score: number; maxScore: number; durationSec: number; distractions: number }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: battle } = await supabase.from("battles").select("*").eq("id", data.battleId).maybeSingle();
    if (!battle) throw new Error("Battle not found");
    if (battle.challenger_id !== userId && battle.opponent_id !== userId)
      throw new Error("You are not in this battle");
    if (battle.status === "finished") return { ok: true, resolved: true, winnerId: battle.winner_id };

    await supabase.from("battle_results").upsert(
      {
        battle_id: battle.id,
        user_id: userId,
        score: Math.max(0, data.score),
        max_score: Math.max(0, data.maxScore),
        duration_sec: Math.max(0, data.durationSec),
        distractions: Math.max(0, data.distractions),
      },
      { onConflict: "battle_id,user_id" },
    );

    const { data: results } = await supabase.from("battle_results").select("*").eq("battle_id", battle.id);
    const rows = results ?? [];
    if (rows.length < 2) return { ok: true, resolved: false, winnerId: null };

    const mine = rows.find((r) => r.user_id === battle.challenger_id)!;
    const theirs = rows.find((r) => r.user_id === battle.opponent_id)!;

    const validated = (r: typeof mine) =>
      Math.round(r.duration_sec * (1 - Math.min(r.distractions, 3) * 0.1));

    let winnerId: string | null = null;
    if (battle.mode === "focus") {
      const a = validated(mine);
      const b = validated(theirs);
      winnerId = a === b ? null : a > b ? mine.user_id : theirs.user_id;
    } else {
      if (mine.score !== theirs.score) winnerId = mine.score > theirs.score ? mine.user_id : theirs.user_id;
      else if (mine.duration_sec !== theirs.duration_sec)
        winnerId = mine.duration_sec < theirs.duration_sec ? mine.user_id : theirs.user_id;
    }

    const loserId = winnerId
      ? winnerId === battle.challenger_id
        ? battle.opponent_id
        : battle.challenger_id
      : null;

    await supabase
      .from("battles")
      .update({
        status: "finished",
        winner_id: winnerId,
        challenger_sec: mine.duration_sec,
        opponent_sec: theirs.duration_sec,
      })
      .eq("id", battle.id);

    if (winnerId && loserId) {
      const [{ data: bets }, { data: winnerProfile }, { data: loserProfile }] = await Promise.all([
        supabaseAdmin.from("battle_bets").select("user_id, meme_id").eq("battle_id", battle.id),
        supabaseAdmin.from("profiles").select("id, display_name, username, worms, xp").eq("id", winnerId).maybeSingle(),
        supabaseAdmin.from("profiles").select("id, display_name, username").eq("id", loserId).maybeSingle(),
      ]);

      const loserBet = (bets ?? []).find((b) => b.user_id === loserId);
      if (loserBet) {
        await supabaseAdmin.from("user_memes").delete().eq("user_id", loserId).eq("meme_id", loserBet.meme_id);
        const { data: already } = await supabaseAdmin
          .from("user_memes")
          .select("id")
          .eq("user_id", winnerId)
          .eq("meme_id", loserBet.meme_id)
          .maybeSingle();
        if (!already) {
          await supabaseAdmin
            .from("user_memes")
            .insert({ user_id: winnerId, meme_id: loserBet.meme_id, source: "battle" });
        }
      }
      await supabaseAdmin.from("battle_bets").update({ settled: true }).eq("battle_id", battle.id);

      await supabaseAdmin
        .from("profiles")
        .update({ worms: (winnerProfile?.worms ?? 0) + WIN_WORMS, xp: (winnerProfile?.xp ?? 0) + WIN_XP })
        .eq("id", winnerId);
      await supabaseAdmin
        .from("transactions")
        .insert({ user_id: winnerId, delta_worms: WIN_WORMS, reason: "battle_win", ref_id: battle.id });

      const winnerName = winnerProfile?.display_name ?? winnerProfile?.username ?? "Someone";
      const loserName = loserProfile?.display_name ?? loserProfile?.username ?? "their friend";
      const modeLabel = MODE_LABEL[battle.mode] ?? "study battle";
      const { victoryLine, shameLine } = await import("@/lib/battles.server");

      await supabaseAdmin.from("posts").insert([
        {
          user_id: winnerId,
          class_id: battle.class_id,
          type: "battle",
          body: victoryLine(winnerName, loserName, modeLabel),
          payload: { battleId: battle.id, stage: "victory", worms: WIN_WORMS, xp: WIN_XP },
        },
        {
          user_id: loserId,
          class_id: battle.class_id,
          type: "shame",
          body: shameLine(winnerName, loserName, modeLabel),
          payload: { battleId: battle.id, stage: "defeat" },
        },
      ]);
    }

    return { ok: true, resolved: true, winnerId };
  });

export const getBattleStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: battles } = await supabase
      .from("battles")
      .select("id, mode, status, winner_id, challenger_id, opponent_id, stake_worms")
      .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`);
    const rows = (battles ?? []).filter((b) => b.status === "finished");
    const wins = rows.filter((b) => b.winner_id === userId);
    const losses = rows.filter((b) => b.winner_id && b.winner_id !== userId);

    const { data: results } = await supabase
      .from("battle_results")
      .select("score, max_score, duration_sec, battle_id")
      .eq("user_id", userId);

    const mineIds = new Set(rows.map((b) => b.id));
    const my = (results ?? []).filter((r) => mineIds.has(r.battle_id));

    return {
      total: rows.length,
      wins: wins.length,
      losses: losses.length,
      winRate: rows.length ? Math.round((wins.length / rows.length) * 100) : 0,
      wormsEarned: wins.reduce((s, b) => s + (b.stake_worms ?? 0), 0),
      memesWon: wins.length,
      longestFocusSec: Math.max(0, ...my.map((r) => r.duration_sec ?? 0)),
      highestQuizScore: Math.max(0, ...my.map((r) => r.score ?? 0)),
    };
  });

export const getBattleLeaderboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { scope: "class" | "global"; classId?: string | null }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let memberIds: string[] | null = null;
    if (data.scope === "class") {
      if (!data.classId) return [];
      const { data: members } = await supabase.from("class_members").select("user_id").eq("class_id", data.classId);
      memberIds = (members ?? []).map((m) => m.user_id);
      if (!memberIds.includes(userId)) throw new Error("You are not a member of this class");
    }

    let q = supabaseAdmin.from("battles").select("winner_id, challenger_id, opponent_id, status").eq("status", "finished");
    if (data.classId && data.scope === "class") q = q.eq("class_id", data.classId);
    const { data: rows } = await q;

    const tally = new Map<string, { wins: number; total: number }>();
    const bump = (id: string, win: boolean) => {
      const cur = tally.get(id) ?? { wins: 0, total: 0 };
      cur.total += 1;
      if (win) cur.wins += 1;
      tally.set(id, cur);
    };
    for (const b of rows ?? []) {
      if (memberIds && !memberIds.includes(b.challenger_id)) continue;
      bump(b.challenger_id, b.winner_id === b.challenger_id);
      bump(b.opponent_id, b.winner_id === b.opponent_id);
    }

    const top = [...tally.entries()]
      .map(([id, v]) => ({
        userId: id,
        wins: v.wins,
        total: v.total,
        winRate: v.total ? Math.round((v.wins / v.total) * 100) : 0,
        battleXp: v.wins * 40,
      }))
      .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate)
      .slice(0, 25);

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, username, display_name, avatar_url, mascot_skin, level")
      .in("id", top.length ? top.map((t) => t.userId) : [EMPTY_UUID]);

    return top.map((t) => ({ ...t, profile: profiles?.find((p) => p.id === t.userId) ?? null }));
  });
