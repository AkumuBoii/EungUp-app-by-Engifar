import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  levelFromXp,
  xpForLevel,
  validatedSeconds,
  wormsFor,
  pickRarity,
  localDay,
  isNextDay,
  STREAK_MILESTONES,
  EMPTY_UUID,
  makeInviteCode,
  pickGachaRarity,
  rarityAtLeast,
  ROLL_COST,
  TEN_ROLL_COST,
  PITY_EPIC,
  PITY_LEGENDARY,
} from "@/lib/gamification";
import {
  sessionMeme,
  milestoneMeme,
  shameMeme,
  taskDoneMeme,
  helpMeme,
} from "@/lib/meme-captions";

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (!profile) {
      const created = await supabaseAdmin
        .from("profiles")
        .insert({ id: userId })
        .select("*")
        .single();
      profile = created.data;
      await supabaseAdmin.from("streaks").insert({ user_id: userId }).select();
    }

    const day = localDay(profile?.timezone ?? "Asia/Bangkok");
    const [{ data: streak }, { data: today }] = await Promise.all([
      supabase.from("streaks").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("daily_stats").select("*").eq("user_id", userId).eq("day", day).maybeSingle(),
    ]);

    if (!streak) await supabaseAdmin.from("streaks").insert({ user_id: userId });

    return {
      profile,
      streak: streak ?? { current: 0, longest: 0, freezes_left: 1, last_active_day: null },
      today: today ?? { total_sec: 0, goal_sec: (profile?.daily_goal_min ?? 60) * 60, goal_met: false },
      day,
      nextLevelXp: xpForLevel(profile?.level ?? 1),
    };
  });

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      username: string;
      displayName: string;
      mascotSkin: string;
      dailyGoalMin: number;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const username = data.username.trim().toLowerCase();
    if (username.length < 3) throw new Error("Username must be at least 3 characters");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: taken } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .neq("id", userId)
      .maybeSingle();
    if (taken) throw new Error("That username is already taken");

    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      username,
      display_name: data.displayName.trim() || username,
      mascot_skin: data.mascotSkin,
      daily_goal_min: Math.max(10, Math.min(600, data.dailyGoalMin)),
      onboarded: true,
    });
    await supabaseAdmin.from("streaks").upsert({ user_id: userId }, { onConflict: "user_id" });

    return { ok: true };
  });

/* ---------------- Classes ---------------- */

export const listMyClasses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: memberships } = await supabase
      .from("class_members")
      .select("class_id, role, joined_at")
      .eq("user_id", userId);
    const ids = (memberships ?? []).map((m) => m.class_id);
    if (!ids.length) return [];
    const [{ data: classes }, { data: allMembers }] = await Promise.all([
      supabase.from("classes").select("*").in("id", ids),
      supabase.from("class_members").select("class_id, user_id, role").in("class_id", ids),
    ]);
    const memberIds = [...new Set((allMembers ?? []).map((m) => m.user_id))];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, username, display_name, mascot_skin, avatar_url")
      .in("id", memberIds.length ? memberIds : [EMPTY_UUID]);

    return (classes ?? []).map((c) => ({
      ...c,
      isOwner: c.owner_id === userId,
      members: (allMembers ?? [])
        .filter((m) => m.class_id === c.id)
        .map((m) => ({ ...m, profile: profiles?.find((p) => p.id === m.user_id) ?? null })),
    }));
  });

export const createClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string; description?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const name = data.name.trim();
    if (name.length < 2) throw new Error("Give your class a name");

    let created: { id: string; name: string; invite_code: string } | null = null;
    for (let attempt = 0; attempt < 5 && !created; attempt += 1) {
      const code = makeInviteCode(name);
      const { data: row, error } = await supabase
        .from("classes")
        .insert({ name, description: data.description?.trim() || null, owner_id: userId, invite_code: code })
        .select("id, name, invite_code")
        .single();
      if (!error && row) created = row;
      else if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    }
    if (!created) throw new Error("Could not generate an invite code, try again");

    await supabase.from("class_members").insert({ class_id: created.id, user_id: userId, role: "owner" });
    return created;
  });

export const lookupClassByCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data, context }) => {
    const code = data.code.trim().toUpperCase();
    const { data: found } = await context.supabase
      .from("classes")
      .select("id, name, description, invite_code")
      .eq("invite_code", code)
      .maybeSingle();
    if (!found) return null;
    const { count } = await context.supabase
      .from("class_members")
      .select("user_id", { count: "exact", head: true })
      .eq("class_id", found.id);
    return { ...found, memberCount: count ?? 0 };
  });

export const joinClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const code = data.code.trim().toUpperCase();
    const { data: found } = await supabase
      .from("classes")
      .select("id, name, invite_code")
      .eq("invite_code", code)
      .maybeSingle();
    if (!found) throw new Error("No class with that invite code");
    const { error } = await supabase
      .from("class_members")
      .upsert({ class_id: found.id, user_id: userId }, { onConflict: "class_id,user_id" });
    if (error) throw new Error(error.message);
    return found;
  });

export const leaveClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { classId: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("class_members")
      .delete()
      .eq("class_id", data.classId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [tasks, posts, sessions] = await Promise.all([
      supabase
        .from("tasks")
        .select("*, subjects(name, color)")
        .eq("user_id", userId)
        .neq("status", "done")
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(20),
      supabase.from("posts").select("*").order("created_at", { ascending: false }).limit(30),
      supabase
        .from("study_sessions")
        .select("id, duration_sec, mode, ended_at, subject_id")
        .eq("user_id", userId)
        .not("ended_at", "is", null)
        .order("ended_at", { ascending: false })
        .limit(7),
    ]);

    const feedRows = posts.data ?? [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: authors } = await supabaseAdmin
      .from("profiles")
      .select("id, username, display_name, mascot_skin")
      .in("id", feedRows.length ? [...new Set(feedRows.map((p) => p.user_id))] : [EMPTY_UUID]);

    return {
      tasks: tasks.data ?? [],
      feed: feedRows.map((post) => ({
        ...post,
        author: authors?.find((a) => a.id === post.user_id) ?? null,
      })),
      recentSessions: sessions.data ?? [],
    };
  });

export const listSubjectsAndTasks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { classId?: string | null } | undefined) => data ?? {})
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const classId = data?.classId ?? null;
    const subjectQuery = supabase.from("subjects").select("*").order("created_at");
    const taskQuery = supabase
      .from("tasks")
      .select("*, subjects(name, color)")
      .order("due_at", { ascending: true, nullsFirst: false });

    const [subjects, tasks] = await Promise.all([
      classId ? subjectQuery.eq("class_id", classId) : subjectQuery.eq("user_id", userId).is("class_id", null),
      classId ? taskQuery.eq("class_id", classId) : taskQuery.eq("user_id", userId).is("class_id", null),
    ]);

    const rows = tasks.data ?? [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: owners } = await supabaseAdmin
      .from("profiles")
      .select("id, username, display_name")
      .in("id", rows.length ? [...new Set(rows.map((t) => t.user_id))] : [EMPTY_UUID]);

    return {
      subjects: subjects.data ?? [],
      tasks: rows.map((task) => ({
        ...task,
        owner: owners?.find((o) => o.id === task.user_id) ?? null,
        isMine: task.user_id === userId,
      })),
    };
  });

export const createSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { name: string; color: string; classId: string | null }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("subjects").insert({
      user_id: context.userId,
      name: data.name.trim(),
      color: data.color,
      class_id: data.classId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      title: string;
      subjectId: string | null;
      dueAt: string | null;
      description?: string;
      classId: string | null;
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("tasks").insert({
      user_id: context.userId,
      title: data.title.trim(),
      subject_id: data.subjectId,
      due_at: data.dueAt,
      description: data.description ?? null,
      class_id: data.classId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const submitTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { taskId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: task } = await supabase
      .from("tasks")
      .select("*, subjects(name)")
      .eq("id", data.taskId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!task) throw new Error("Task not found");
    if (task.status === "done") return { ok: true, worms: 0 };

    await supabase
      .from("tasks")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("id", data.taskId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const reward = 25;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("worms, display_name, username")
      .eq("id", userId)
      .single();
    await supabaseAdmin
      .from("profiles")
      .update({ worms: (profile?.worms ?? 0) + reward })
      .eq("id", userId);
    await supabaseAdmin
      .from("transactions")
      .insert({ user_id: userId, delta_worms: reward, reason: "task_complete", ref_id: task.id });
    const meme = taskDoneMeme(profile?.display_name ?? profile?.username ?? "Someone", task.title);
    await supabaseAdmin.from("posts").insert({
      user_id: userId,
      class_id: task.class_id,
      type: "task_done",
      body: `finished "${task.title}"`,
      payload: { taskId: task.id, worms: reward, ...meme },
    });

    return { ok: true, worms: reward };
  });

export const askForHelp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { taskId: string; message: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: task } = await supabase
      .from("tasks")
      .select("id, title, class_id")
      .eq("id", data.taskId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!task) throw new Error("Task not found");
    const { data: helper } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", userId)
      .maybeSingle();
    const helpStamp = helpMeme(helper?.display_name ?? helper?.username ?? "Someone", task.title);
    const { error } = await supabase.from("posts").insert({
      user_id: userId,
      class_id: task.class_id,
      type: "help",
      body: data.message.trim() || `needs help with "${task.title}"`,
      payload: { taskId: task.id, taskTitle: task.title, ...helpStamp },
    });

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const startSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { mode: "stopwatch" | "countdown" | "task_focus"; taskId: string | null; targetSec: number | null }) =>
      data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let subjectId: string | null = null;
    if (data.taskId) {
      const { data: task } = await supabase
        .from("tasks")
        .select("subject_id")
        .eq("id", data.taskId)
        .eq("user_id", userId)
        .maybeSingle();
      subjectId = task?.subject_id ?? null;
      await supabase.from("tasks").update({ status: "in_progress" }).eq("id", data.taskId);
    }
    const { data: session, error } = await supabase
      .from("study_sessions")
      .insert({
        user_id: userId,
        mode: data.mode,
        task_id: data.taskId,
        subject_id: subjectId,
        target_sec: data.targetSec,
      })
      .select("id, started_at, mode, target_sec")
      .single();
    if (error) throw new Error(error.message);
    return session;
  });

export const stopSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { sessionId: string; elapsedSec: number; strikes: number; classId?: string | null }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Posts are class-scoped: only attribute to a class the user actually belongs to.
    let postClassId: string | null = null;
    if (data.classId) {
      const { data: membership } = await supabase
        .from("class_members")
        .select("class_id")
        .eq("class_id", data.classId)
        .eq("user_id", userId)
        .maybeSingle();
      postClassId = membership?.class_id ?? null;
    }

    const { data: session } = await supabase
      .from("study_sessions")
      .select("*, tasks(title), subjects(name)")
      .eq("id", data.sessionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!session) throw new Error("Session not found");
    if (session.ended_at) throw new Error("Session already finished");

    const wallClock = Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000);
    const raw = Math.max(0, Math.min(data.elapsedSec, wallClock + 5));
    const strikes = Math.max(0, Math.min(data.strikes, 10));
    const seconds = validatedSeconds(raw, strikes);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    const timezone = profile?.timezone ?? "Asia/Bangkok";
    const day = localDay(timezone);
    const goalSec = (profile?.daily_goal_min ?? 60) * 60;

    const { data: existing } = await supabaseAdmin
      .from("daily_stats")
      .select("*")
      .eq("user_id", userId)
      .eq("day", day)
      .maybeSingle();
    const totalSec = (existing?.total_sec ?? 0) + seconds;
    const goalMetNow = totalSec >= goalSec;
    const goalJustMet = goalMetNow && !(existing?.goal_met ?? false);

    const { data: streak } = await supabaseAdmin
      .from("streaks")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: booster } = await supabaseAdmin
      .from("inventory")
      .select("active_until, gacha_items(payload)")
      .eq("user_id", userId)
      .gt("active_until", new Date().toISOString())
      .limit(1)
      .maybeSingle();

    let worms = wormsFor(seconds, {
      goalMet: goalMetNow,
      streak: streak?.current ?? 0,
      booster: Boolean(booster),
    });
    const xp = Math.floor(seconds / 60);

    // streak update
    let current = streak?.current ?? 0;
    let longest = streak?.longest ?? 0;
    let milestone: number | null = null;
    if (goalJustMet) {
      current = isNextDay(streak?.last_active_day ?? null, day) ? current + 1 : 1;
      longest = Math.max(longest, current);
      if (STREAK_MILESTONES.includes(current)) milestone = current;
      await supabaseAdmin
        .from("streaks")
        .upsert(
          { user_id: userId, current, longest, last_active_day: day, freezes_left: streak?.freezes_left ?? 1 },
          { onConflict: "user_id" },
        );
    }

    let bonus = 0;
    if (goalJustMet) bonus += 20;
    if (milestone) bonus += milestone * 5;
    worms += bonus;

    const newXp = (profile?.xp ?? 0) + xp;
    await Promise.all([
      supabaseAdmin
        .from("study_sessions")
        .update({
          ended_at: new Date().toISOString(),
          duration_sec: seconds,
          strikes,
          worms_awarded: worms,
          xp_awarded: xp,
          verified: true,
        })
        .eq("id", session.id),
      supabaseAdmin.from("daily_stats").upsert(
        { user_id: userId, day, total_sec: totalSec, goal_sec: goalSec, goal_met: goalMetNow },
        { onConflict: "user_id,day" },
      ),
      supabaseAdmin
        .from("profiles")
        .update({ worms: (profile?.worms ?? 0) + worms, xp: newXp, level: levelFromXp(newXp) })
        .eq("id", userId),
      supabaseAdmin
        .from("transactions")
        .insert({ user_id: userId, delta_worms: worms, reason: "study_session", ref_id: session.id }),
    ]);

    if (session.subject_id) {
      const { data: st } = await supabaseAdmin
        .from("subject_stats")
        .select("*")
        .eq("user_id", userId)
        .eq("subject_id", session.subject_id)
        .maybeSingle();
      await supabaseAdmin.from("subject_stats").upsert(
        {
          user_id: userId,
          subject_id: session.subject_id,
          total_sec: (st?.total_sec ?? 0) + seconds,
          sessions: (st?.sessions ?? 0) + 1,
        },
        { onConflict: "user_id,subject_id" },
      );
    }

    // meme drop on milestone
    let drop: { title: string; rarity: string; caption: string | null } | null = null;
    if (milestone) {
      const rarity = pickRarity(Math.random());
      const { data: pool } = await supabaseAdmin.from("memes").select("*").eq("rarity", rarity);
      const pick = pool?.[Math.floor(Math.random() * (pool?.length ?? 1))];
      if (pick) {
        await supabaseAdmin
          .from("user_memes")
          .upsert({ user_id: userId, meme_id: pick.id, source: "milestone" }, { onConflict: "user_id,meme_id" });
        drop = { title: pick.title, rarity: pick.rarity, caption: pick.caption };
      }
    }

    const subjectName = (session.subjects as { name?: string } | null)?.name ?? "something";
    const displayName = profile?.display_name ?? profile?.username ?? "Someone";
    const minutes = Math.round(seconds / 60);
    await supabaseAdmin.from("posts").insert({
      user_id: userId,
      class_id: postClassId,
      type: "session",
      body: `studied ${subjectName} for ${minutes} minutes`,
      payload: {
        minutes,
        worms,
        strikes,
        mode: session.mode,
        ...sessionMeme(displayName, subjectName, minutes),
      },
    });
    if (milestone) {
      await supabaseAdmin.from("posts").insert({
        user_id: userId,
        class_id: postClassId,
        type: "milestone",
        body: `hit a ${milestone}-day streak 🔥`,
        payload: { milestone, ...milestoneMeme(displayName, milestone) },
      });
    }
    if (strikes >= 3) {
      const { data: shame } = await supabaseAdmin
        .from("memes")
        .select("*")
        .eq("slug", "ueng-shame")
        .maybeSingle();
      await supabaseAdmin.from("posts").insert({
        user_id: userId,
        class_id: postClassId,
        type: "shame",
        body: `got caught tab-switching ${strikes} times`,
        payload: { strikes, memeTitle: shame?.title ?? "Shame อึ่ง", ...shameMeme(displayName, strikes) },
      });
    }

    return {
      seconds,
      minutes,
      worms,
      xp,
      strikes,
      goalMet: goalMetNow,
      goalJustMet,
      streak: current,
      milestone,
      drop,
      level: levelFromXp(newXp),
    };
  });

export const getFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { classId?: string | null; limit?: number } | undefined) => data ?? {})
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let query = supabase
      .from("posts")
      .select("*, reactions(emoji, user_id), comments(id, body, user_id, created_at)")
      .order("created_at", { ascending: false })
      .limit(data?.limit ?? 50);
    // The class is the container: a class feed only shows that class's posts.
    if (data?.classId) query = query.eq("class_id", data.classId);
    const { data: posts } = await query;
    const rows = posts ?? [];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: authors } = await supabaseAdmin
      .from("profiles")
      .select("id, username, display_name, mascot_skin")
      .in("id", rows.length ? [...new Set(rows.map((p) => p.user_id))] : [EMPTY_UUID]);
    return rows.map((post) => ({
      ...post,
      author: authors?.find((a) => a.id === post.user_id) ?? null,
    }));
  });

export const reactToPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { postId: string; emoji: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("reactions")
      .select("id")
      .eq("post_id", data.postId)
      .eq("user_id", userId)
      .eq("emoji", data.emoji)
      .maybeSingle();
    if (existing) {
      await supabase.from("reactions").delete().eq("id", existing.id);
      return { reacted: false };
    }
    await supabase.from("reactions").insert({ post_id: data.postId, user_id: userId, emoji: data.emoji });
    return { reacted: true };
  });

export const commentOnPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { postId: string; body: string }) => data)
  .handler(async ({ data, context }) => {
    if (!data.body.trim()) throw new Error("Say something");
    const { error } = await context.supabase
      .from("comments")
      .insert({ post_id: data.postId, user_id: context.userId, body: data.body.trim() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const pokeSlacker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { toUser: string; message?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.toUser === userId) throw new Error("You cannot poke yourself");
    const since = new Date(Date.now() - 86400000).toISOString();
    const { count } = await supabase
      .from("pokes")
      .select("id", { count: "exact", head: true })
      .eq("from_user", userId)
      .eq("to_user", data.toUser)
      .gte("created_at", since);
    if ((count ?? 0) >= 3) throw new Error("อึ่ง says: that is enough poking for today");
    const { error } = await supabase.from("pokes").insert({
      from_user: userId,
      to_user: data.toUser,
      message: data.message ?? "อึ่ง is watching you slack",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getLeaderboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      period: "daily" | "weekly" | "monthly";
      classId?: string | null;
      metric?: "time" | "worms" | "streak" | "battles";
    }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const days = data.period === "daily" ? 1 : data.period === "weekly" ? 7 : 30;
    const sinceDay = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const sinceTs = new Date(Date.now() - days * 86400000).toISOString();
    const metric = data.metric ?? "time";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Rankings are computed only among members of the selected class.
    let memberIds: string[] | null = null;
    if (data.classId) {
      const { data: members } = await supabase
        .from("class_members")
        .select("user_id")
        .eq("class_id", data.classId);
      memberIds = (members ?? []).map((m) => m.user_id);
      if (!memberIds.includes(userId)) throw new Error("You are not a member of this class");
      if (!memberIds.length) return [];
    }

    const totals = new Map<string, number>();
    const add = (id: string, v: number) => totals.set(id, (totals.get(id) ?? 0) + v);

    if (metric === "worms") {
      let q = supabaseAdmin.from("transactions").select("user_id, delta_worms").gte("created_at", sinceTs);
      if (memberIds) q = q.in("user_id", memberIds);
      const { data: rows } = await q;
      for (const row of rows ?? []) if ((row.delta_worms ?? 0) > 0) add(row.user_id, row.delta_worms);
    } else if (metric === "streak") {
      let q = supabaseAdmin.from("streaks").select("user_id, current");
      if (memberIds) q = q.in("user_id", memberIds);
      const { data: rows } = await q;
      for (const row of rows ?? []) add(row.user_id, row.current ?? 0);
    } else if (metric === "battles") {
      let q = supabaseAdmin
        .from("battles")
        .select("winner_id, class_id")
        .not("winner_id", "is", null)
        .gte("created_at", sinceTs);
      if (data.classId) q = q.eq("class_id", data.classId);
      const { data: rows } = await q;
      for (const row of rows ?? []) if (row.winner_id) add(row.winner_id, 1);
      for (const id of memberIds ?? []) if (!totals.has(id)) totals.set(id, 0);
    } else {
      let q = supabaseAdmin.from("daily_stats").select("user_id, total_sec").gte("day", sinceDay);
      if (memberIds) q = q.in("user_id", memberIds);
      const { data: rows } = await q;
      for (const row of rows ?? []) add(row.user_id, row.total_sec ?? 0);
    }

    const top = [...totals.entries()]
      .map(([id, value]) => ({ userId: id, seconds: metric === "time" ? value : 0, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 25);

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, username, display_name, mascot_skin, level")
      .in("id", top.length ? top.map((t) => t.userId) : [EMPTY_UUID]);

    return top.map((entry) => ({
      ...entry,
      metric,
      profile: profiles?.find((p) => p.id === entry.userId) ?? null,
    }));
  });

export const getCollection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [catalog, owned] = await Promise.all([
      context.supabase.from("memes").select("*").order("rarity"),
      context.supabase.from("user_memes").select("meme_id, source, obtained_at").eq("user_id", context.userId),
    ]);
    return { catalog: catalog.data ?? [], owned: owned.data ?? [] };
  });

/* ---------------- Gachapon ---------------- */

export const getGacha = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [pool, profile, pulls, inv] = await Promise.all([
      supabase.from("gacha_items").select("*").eq("active", true).order("rarity"),
      supabase
        .from("profiles")
        .select("worms, total_rolls, pity_epic, pity_legendary")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("gacha_pulls")
        .select("id, name, rarity, category, pity_hit, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("inventory").select("item_id, qty, equipped, active_until").eq("user_id", userId),
    ]);
    return {
      pool: pool.data ?? [],
      worms: profile.data?.worms ?? 0,
      totalRolls: profile.data?.total_rolls ?? 0,
      pityEpic: profile.data?.pity_epic ?? 0,
      pityLegendary: profile.data?.pity_legendary ?? 0,
      history: pulls.data ?? [],
      inventory: inv.data ?? [],
    };
  });

export const getInventory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [inv, profile] = await Promise.all([
      supabase
        .from("inventory")
        .select("id, qty, equipped, active_until, item_id, gacha_items(*)")
        .eq("user_id", userId),
      supabase.from("profiles").select("mascot_skin, worms").eq("id", userId).maybeSingle(),
    ]);
    return {
      items: inv.data ?? [],
      mascotSkin: profile.data?.mascot_skin ?? "classic",
      worms: profile.data?.worms ?? 0,
    };
  });

export const equipItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { inventoryId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabase
      .from("inventory")
      .select("id, item_id, gacha_items(kind, payload)")
      .eq("id", data.inventoryId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!row) throw new Error("Item not in your inventory");
    const item = row.gacha_items as { kind: string; payload: Record<string, string> } | null;
    if (!item) throw new Error("Item not found");

    const { data: siblings } = await supabaseAdmin
      .from("inventory")
      .select("id, gacha_items(kind)")
      .eq("user_id", userId);
    for (const s of siblings ?? []) {
      if ((s.gacha_items as { kind: string } | null)?.kind === item.kind) {
        await supabaseAdmin.from("inventory").update({ equipped: false }).eq("id", s.id);
      }
    }
    await supabaseAdmin.from("inventory").update({ equipped: true }).eq("id", row.id);
    if (item.kind === "skin" && item.payload?.["skin"]) {
      await supabaseAdmin.from("profiles").update({ mascot_skin: item.payload["skin"] }).eq("id", userId);
    }
    return { ok: true };
  });

export const rollGacha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { count: 1 | 10 }) => data)
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const count = data.count === 10 ? 10 : 1;
    const cost = count === 10 ? TEN_ROLL_COST : ROLL_COST;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("worms, total_rolls, pity_epic, pity_legendary")
      .eq("id", userId)
      .single();
    if ((profile?.worms ?? 0) < cost) throw new Error("Not enough worms yet — go study!");

    const [{ data: pool }, { data: memes }] = await Promise.all([
      supabaseAdmin.from("gacha_items").select("*").eq("active", true),
      supabaseAdmin.from("memes").select("id, slug, title, rarity, caption, image_url"),
    ]);

    let pityEpic = profile?.pity_epic ?? 0;
    let pityLegendary = profile?.pity_legendary ?? 0;
    const results: {
      name: string;
      rarity: string;
      category: string;
      description: string | null;
      pityHit: boolean;
      isMeme: boolean;
      slug: string | null;
      kind: string;
      payload: Record<string, string | number>;
    }[] = [];


    for (let i = 0; i < count; i += 1) {
      pityEpic += 1;
      pityLegendary += 1;
      let rarity: string = pickGachaRarity(Math.random());
      let pityHit = false;
      if (pityLegendary >= PITY_LEGENDARY) {
        rarity = "legendary";
        pityHit = true;
      } else if (pityEpic >= PITY_EPIC && !rarityAtLeast(rarity, "epic")) {
        rarity = Math.random() < 0.2 ? "legendary" : "epic";
        pityHit = true;
      }
      if (rarity === "legendary") pityLegendary = 0;
      if (rarityAtLeast(rarity, "epic")) pityEpic = 0;

      const memePool = (memes ?? []).filter((m) => m.rarity === rarity);
      const itemPool = (pool ?? []).filter((p) => p.rarity === rarity);
      const takeMeme = memePool.length > 0 && (itemPool.length === 0 || Math.random() < 0.4);

      if (takeMeme) {
        const pick = memePool[Math.floor(Math.random() * memePool.length)]!;
        await supabaseAdmin
          .from("user_memes")
          .upsert({ user_id: userId, meme_id: pick.id, source: "gacha" }, { onConflict: "user_id,meme_id" });
        await supabaseAdmin.from("gacha_pulls").insert({
          user_id: userId,
          meme_id: pick.id,
          name: pick.title,
          rarity: pick.rarity,
          category: "meme",
          pity_hit: pityHit,
        });
        results.push({
          name: pick.title,
          rarity: pick.rarity,
          category: "meme",
          description: pick.caption,
          pityHit,
          isMeme: true,
          slug: pick.slug,
          kind: "meme",
          payload: {},
        });
        continue;
      }

      const fallback = itemPool.length ? itemPool : (pool ?? []);
      if (!fallback.length) continue;
      const item = fallback[Math.floor(Math.random() * fallback.length)]!;
      const payload = (item.payload ?? {}) as { effect?: string; hours?: number; skin?: string };

      const { data: existing } = await supabaseAdmin
        .from("inventory")
        .select("id, qty")
        .eq("user_id", userId)
        .eq("item_id", item.id)
        .maybeSingle();
      const activeUntil =
        payload.effect === "double_worms"
          ? new Date(Date.now() + (payload.hours ?? 24) * 3600000).toISOString()
          : null;
      if (existing) {
        await supabaseAdmin
          .from("inventory")
          .update({ qty: existing.qty + 1, active_until: activeUntil })
          .eq("id", existing.id);
      } else {
        await supabaseAdmin
          .from("inventory")
          .insert({ user_id: userId, item_id: item.id, qty: 1, active_until: activeUntil });
      }
      if (payload.effect === "streak_freeze") {
        const { data: streak } = await supabaseAdmin
          .from("streaks")
          .select("freezes_left")
          .eq("user_id", userId)
          .maybeSingle();
        await supabaseAdmin
          .from("streaks")
          .upsert({ user_id: userId, freezes_left: (streak?.freezes_left ?? 0) + 1 }, { onConflict: "user_id" });
      }
      await supabaseAdmin.from("gacha_pulls").insert({
        user_id: userId,
        item_id: item.id,
        name: item.name,
        rarity: item.rarity,
        category: item.category,
        pity_hit: pityHit,
      });
      results.push({
        name: item.name,
        rarity: item.rarity,
        category: item.category,
        description: item.description,
        pityHit,
        isMeme: false,
        slug: null,
        kind: item.kind,
        payload: (item.payload ?? {}) as Record<string, string | number>,
      });
    }

    await supabaseAdmin
      .from("profiles")
      .update({
        worms: (profile?.worms ?? 0) - cost,
        total_rolls: (profile?.total_rolls ?? 0) + count,
        pity_epic: pityEpic,
        pity_legendary: pityLegendary,
      })
      .eq("id", userId);
    await supabaseAdmin
      .from("transactions")
      .insert({ user_id: userId, delta_worms: -cost, reason: `gacha:${count}x` });

    return { results, pityEpic, pityLegendary, spent: cost };
  });


export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { displayName?: string; avatarUrl?: string | null; dailyGoalMin?: number }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const updates: { display_name?: string; avatar_url?: string | null; daily_goal_min?: number } = {};
    if (data.displayName !== undefined) {
      const name = data.displayName.trim();
      if (name.length < 1) throw new Error("Display name cannot be empty");
      updates.display_name = name;
    }
    if (data.avatarUrl !== undefined) updates.avatar_url = data.avatarUrl;
    if (data.dailyGoalMin !== undefined) {
      updates.daily_goal_min = Math.min(720, Math.max(10, Math.round(data.dailyGoalMin)));
    }


    const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAvatarUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { path: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(data.path, 3600);
    return { signedUrl: signed?.signedUrl ?? null };
  });

/* ---------------- Class hub ---------------- */

export const getClassDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { classId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const classId = data.classId;

    const { data: klass } = await supabase
      .from("classes")
      .select("*")
      .eq("id", classId)
      .maybeSingle();
    if (!klass) throw new Error("Class not found");

    const { data: members } = await supabase
      .from("class_members")
      .select("user_id, role, joined_at")
      .eq("class_id", classId);
    const memberIds = (members ?? []).map((m) => m.user_id);
    if (!memberIds.includes(userId)) throw new Error("You are not a member of this class");

    const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [profilesRes, statsRes, tasksRes, postsRes, battlesRes, txRes, streaksRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, username, display_name, mascot_skin, avatar_url, level")
        .in("id", memberIds.length ? memberIds : [EMPTY_UUID]),
      supabaseAdmin.from("daily_stats").select("user_id, day, total_sec").in("user_id", memberIds),
      supabase
        .from("tasks")
        .select("id, title, due_at, status, user_id, subjects(name, color)")
        .eq("class_id", classId)
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(50),
      supabase
        .from("posts")
        .select("id, user_id, type, body, payload, created_at")
        .eq("class_id", classId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("battles")
        .select("*")
        .eq("class_id", classId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabaseAdmin.from("transactions").select("user_id, delta_worms").in("user_id", memberIds),
      supabaseAdmin.from("streaks").select("user_id, current, longest").in("user_id", memberIds),
    ]);

    const profiles = profilesRes.data ?? [];
    const stats = statsRes.data ?? [];
    const tasks = tasksRes.data ?? [];
    const battles = battlesRes.data ?? [];

    const totalSec = stats.reduce((sum, s) => sum + (s.total_sec ?? 0), 0);
    const weekly = new Map<string, number>();
    const allTime = new Map<string, number>();
    for (const s of stats) {
      allTime.set(s.user_id, (allTime.get(s.user_id) ?? 0) + (s.total_sec ?? 0));
      if (s.day >= since) weekly.set(s.user_id, (weekly.get(s.user_id) ?? 0) + (s.total_sec ?? 0));
    }
    const pickTop = (map: Map<string, number>) =>
      [...map.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
    const mostActive = pickTop(allTime);
    const champion = pickTop(weekly);

    const wormsEarned = (txRes.data ?? []).reduce(
      (sum, t) => sum + (t.delta_worms > 0 ? t.delta_worms : 0),
      0,
    );

    const withProfile = <T extends { user_id: string }>(row: T) => ({
      ...row,
      profile: profiles.find((p) => p.id === row.user_id) ?? null,
    });

    return {
      klass: { ...klass, isOwner: klass.owner_id === userId },
      members: (members ?? []).map(withProfile),
      upcomingTasks: tasks.filter((t) => t.status !== "done").slice(0, 8).map(withProfile),
      feed: (postsRes.data ?? []).map(withProfile),
      battles: battles.map((b) => ({
        ...b,
        challenger: profiles.find((p) => p.id === b.challenger_id) ?? null,
        opponent: profiles.find((p) => p.id === b.opponent_id) ?? null,
      })),
      leaderboard: [...weekly.entries()]
        .map(([id, seconds]) => ({ userId: id, seconds, profile: profiles.find((p) => p.id === id) ?? null }))
        .sort((a, b) => b.seconds - a.seconds)
        .slice(0, 5),
      stats: {
        totalSec,
        tasksCompleted: tasks.filter((t) => t.status === "done").length,
        totalBattles: battles.length,
        wormsEarned,
        memberCount: memberIds.length,
        bestStreak: Math.max(0, ...(streaksRes.data ?? []).map((s) => s.longest ?? 0)),
        mostActive: mostActive
          ? { profile: profiles.find((p) => p.id === mostActive[0]) ?? null, seconds: mostActive[1] }
          : null,
        champion: champion
          ? { profile: profiles.find((p) => p.id === champion[0]) ?? null, seconds: champion[1] }
          : null,
      },
    };
  });

/* ---------------- Battles ---------------- */

export const createBattle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { classId: string; opponentId: string; mode: string; targetSec: number; stakeWorms: number }) => data,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.opponentId === userId) throw new Error("Pick someone other than yourself");
    const { error } = await supabase.from("battles").insert({
      class_id: data.classId,
      challenger_id: userId,
      opponent_id: data.opponentId,
      mode: data.mode,
      target_sec: Math.max(600, Math.min(28800, data.targetSec)),
      stake_worms: Math.max(0, Math.min(500, data.stakeWorms)),
      status: "pending",
      ends_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const respondToBattle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { battleId: string; accept: boolean }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: battle } = await supabase
      .from("battles")
      .select("*")
      .eq("id", data.battleId)
      .maybeSingle();
    if (!battle) throw new Error("Battle not found");
    if (battle.opponent_id !== userId) throw new Error("Only the challenged player can answer");
    const { error } = await supabase
      .from("battles")
      .update({ status: data.accept ? "active" : "declined" })
      .eq("id", data.battleId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resolveBattle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { battleId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: battle } = await supabase.from("battles").select("*").eq("id", data.battleId).maybeSingle();
    if (!battle) throw new Error("Battle not found");
    if (battle.challenger_id !== userId && battle.opponent_id !== userId)
      throw new Error("You are not in this battle");
    if (battle.status === "finished") return { ok: true, winnerId: battle.winner_id };

    const since = battle.created_at.slice(0, 10);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: stats } = await supabaseAdmin
      .from("daily_stats")
      .select("user_id, total_sec")
      .in("user_id", [battle.challenger_id, battle.opponent_id])
      .gte("day", since);

    const sum = (id: string) =>
      (stats ?? []).filter((s) => s.user_id === id).reduce((t, s) => t + (s.total_sec ?? 0), 0);
    const challengerSec = sum(battle.challenger_id);
    const opponentSec = sum(battle.opponent_id);
    const winnerId =
      challengerSec === opponentSec ? null : challengerSec > opponentSec ? battle.challenger_id : battle.opponent_id;

    await supabase
      .from("battles")
      .update({
        status: "finished",
        winner_id: winnerId,
        challenger_sec: challengerSec,
        opponent_sec: opponentSec,
      })
      .eq("id", battle.id);

    if (winnerId && battle.stake_worms > 0) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("worms, display_name, username")
        .eq("id", winnerId)
        .maybeSingle();
      await supabaseAdmin
        .from("profiles")
        .update({ worms: (profile?.worms ?? 0) + battle.stake_worms })
        .eq("id", winnerId);
      await supabaseAdmin
        .from("transactions")
        .insert({ user_id: winnerId, delta_worms: battle.stake_worms, reason: "battle_win", ref_id: battle.id });
      await supabaseAdmin.from("posts").insert({
        user_id: winnerId,
        class_id: battle.class_id,
        type: "battle",
        body: `won a study battle (+${battle.stake_worms} 🪱)`,
        payload: { battleId: battle.id, challengerSec, opponentSec },
      });
    }

    return { ok: true, winnerId, challengerSec, opponentSec };
  });

export const listBattles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { classId: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: battles } = await supabase
      .from("battles")
      .select("*")
      .eq("class_id", data.classId)
      .order("created_at", { ascending: false })
      .limit(25);
    const rows = battles ?? [];
    const ids = [...new Set(rows.flatMap((b) => [b.challenger_id, b.opponent_id]))];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, username, display_name, mascot_skin, level")
      .in("id", ids.length ? ids : [EMPTY_UUID]);
    return rows.map((b) => ({
      ...b,
      challenger: profiles?.find((p) => p.id === b.challenger_id) ?? null,
      opponent: profiles?.find((p) => p.id === b.opponent_id) ?? null,
    }));
  });

export const getProfileStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [sessions, tasksDone, battles] = await Promise.all([
      supabase.from("study_sessions").select("duration_sec").eq("user_id", userId).not("ended_at", "is", null),
      supabase.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "done"),
      supabase
        .from("battles")
        .select("winner_id, challenger_id, opponent_id, status")
        .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`),
    ]);

    const totalSec = (sessions.data ?? []).reduce((sum, s) => sum + (s.duration_sec ?? 0), 0);
    const done = (battles.data ?? []).filter((b) => b.status === "done");
    return {
      totalSec,
      sessionCount: sessions.data?.length ?? 0,
      tasksCompleted: tasksDone.count ?? 0,
      battlesWon: done.filter((b) => b.winner_id === userId).length,
      battlesLost: done.filter((b) => b.winner_id && b.winner_id !== userId).length,
    };
  });
