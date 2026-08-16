# MemeStudy — social meme-powered study platform

Mint-green, meme-driven study app with mascot **อึ่ง** (a chubby frog). Students study against
tasks and timers, earn **Worms** (currency) and **Memes** (collectible trophies), battle friends,
climb leaderboards, and get playfully shamed when they slack.

## 1. System architecture

```text
Browser (React + TanStack Start)
  |  routes + typed server functions (RPC)
  v
TanStack server runtime
  |-- Session service    (modes, strikes, validation)
  |-- Task service       (subjects, tasks, files, AI quiz)
  |-- Gamification engine(worms, XP, streaks, drops, boosters)
  |-- Battle service     (matchmaking, bets, scoring)
  |-- Feed service       (auto event posts, reactions, pokes)
  |-- Leaderboard service(daily/weekly/monthly aggregates)
  |-- AI (Lovable AI Gateway: quiz gen, meme captions)
  v
Lovable Cloud (Postgres + Auth + Storage + Realtime)
  RLS on every table · SQL triggers for streaks/payouts · Storage for notes,
  PDFs, slides, meme art, avatars · Realtime for battles, presence, feed
  Cron endpoint /api/public/cron/daily-rollover (secret-verified)
```

All rewards, strikes, and battle results are computed server-side; the client never reports its
own worms or scores.

## 2. Onboarding flow

```text
Sign up / Login -> Create character -> Pick อึ่ง skin -> Choose username
  -> Join group by code OR create group -> Invite friends -> Set daily goal (minutes)
  -> Home Feed
```

## 3. Daily study loop

```text
Home Feed -> Tasks due today -> pick task -> Start Studying
  -> Mode: Stopwatch | Countdown | Task Focus
  -> Session running (pause/resume)
       tab switch / inactivity  -> Strike +1
       3 strikes                -> Shame Meme generated + posted
  -> Stop -> server validates elapsed time
       awards Worms + XP, updates daily goal, streak, subject stats
       streak milestone -> meme drop + bonus worms
       goal completed   -> daily reward
       task completed   -> mark done + leaderboard update
       always           -> auto feed post ("Nat studied Biology for 90 minutes")
  -> back to Home Feed
```

Strike detection: visibility/blur events + heartbeat gaps; grace window before a strike lands;
**Shame Shield** item cancels one shame post.

## 4. Task flow

Create Subject → Create Task (due date) → upload notes/PDF/slides → **AI Generate Quiz** →
Start Working → study session → Submit Task → Completed → worms + feed post + leaderboard.

## 5. Ask-for-help flow

Task page → Ask For Help → help post in feed → friends comment, share notes, send
encouragement, or challenge to battle → helper earns worms when the asker marks the help useful.

## 6. Battle flow

Choose friend → mode (Quiz Battle | Countdown Battle | Endurance Study Battle) → select task →
bet a meme → battle runs (Realtime) → server validates → winner takes the bet meme + worms + XP,
loser gets a shame meme post → battle result feed post.

## 7. Feed

Auto-generated events: new task assigned, due-date reminder, session completed, streak
milestone, battle victory, battle defeat, ask for help, leaderboard change, weekly champion,
monthly wrapped, shame meme.
Friend actions: react, comment, share, poke slacker (rate-limited), send encouragement.

## 8. Leaderboards

Updated on every completed session/quiz. Boards: daily / weekly / monthly study time, quiz
scores, streaks, per-subject. Scopes: friends, group, global. Top 5 weekly get worm rewards,
exclusive memes, and special titles, plus a celebration feed post.

## 9. Shop and inventory

Character skins, accessories, room decorations, meme packs, Streak Freeze, Shame Shield,
Double Worm Booster. Purchases are server-validated and land in inventory.

## 10. Database structure

| Table | Key fields |
| --- | --- |
| `profiles` | id, username, display_name, mascot_skin, worms, xp, level, daily_goal_min, timezone |
| `user_roles` | user_id, role (separate table) |
| `groups` / `group_members` | name, join_code, owner_id / role, joined_at |
| `invites` | group_id, code, inviter_id, accepted_by |
| `subjects` | user_id, name, color, icon |
| `tasks` | id, user_id, subject_id, title, description, due_at, status, completed_at |
| `task_files` | task_id, storage_path, kind (notes/pdf/slides) |
| `quizzes` / `quiz_questions` / `quiz_attempts` | task_id, generated_by_ai / prompt, choices, answer / score, taken_at |
| `study_sessions` | user_id, task_id, subject_id, mode, started_at, ended_at, duration_sec, strikes, verified |
| `session_events` | session_id, type (pause/resume/blur/strike), at |
| `daily_stats` | user_id, day, total_sec, goal_sec, goal_met |
| `subject_stats` | user_id, subject_id, total_sec, sessions |
| `streaks` | user_id, current, longest, last_active_day, freezes_left |
| `memes` / `user_memes` | slug, title, image_url, rarity, caption / obtained_at, source |
| `shop_items` / `inventory` | kind, price_worms, payload / user_id, item_id, qty, active_until |
| `transactions` | user_id, delta_worms, reason, ref_id |
| `battles` / `battle_participants` | mode, task_id, stake_meme_id, status, winner_id / score, finished_at |
| `posts` | user_id, group_id, type, payload jsonb |
| `reactions` / `comments` / `pokes` / `encouragements` | post/user refs, body, emoji |
| `help_requests` | task_id, post_id, resolved_by, reward_paid |
| `leaderboard_snapshots` | scope, period, user_id, rank, value |
| `quests` / `user_quests` | kind, target, reward_worms / progress |
| `notifications` | user_id, type, payload, read_at |

Each table gets GRANTs for `authenticated` + `service_role`, RLS enabled, owner- and
group-scoped policies. Seeded meme catalog and shop items ship in the migration.

## 11. API structure (server functions)

- **Onboarding**: `completeOnboarding`, `checkUsername`, `createGroup`, `joinByCode`, `invite`
- **Tasks**: `createSubject`, `createTask`, `updateTask`, `uploadTaskFile`, `submitTask`,
  `listTasksDueToday`
- **AI**: `generateQuiz(taskId)`, `generateShameMeme(context)`
- **Sessions**: `startSession(mode, taskId)`, `heartbeat`, `reportStrike`, `pause/resume`,
  `stopSession` → returns full reward payload
- **Gamification**: `getWallet`, `getStreak`, `useStreakFreeze`, `claimQuest`, `rollDrop`
- **Battles**: `challengeFriend`, `acceptBattle`, `submitBattleProgress`, `resolveBattle`
- **Feed/social**: `getFeed`, `react`, `comment`, `share`, `pokeSlacker`, `sendEncouragement`,
  `askForHelp`, `markHelpUseful`
- **Leaderboards**: `getLeaderboard({ board, scope, period })`
- **Shop**: `listShop`, `buyItem`, `equipItem`, `getInventory`
- **Cron route**: `/api/public/cron/daily-rollover` — streak decay, weekly payouts, snapshots,
  due-date reminders, monthly wrapped.

## 12. Frontend pages

| Route | Purpose |
| --- | --- |
| `/` | Landing: อึ่ง hero, how it works, CTA |
| `/auth` | Sign in / sign up |
| `/onboarding` | Character → skin → username → group → invite → goal |
| `/app` | Home feed + "due today" strip + quick start |
| `/app/tasks`, `/app/tasks/$id` | Task list; task detail with files, quiz, Ask For Help |
| `/app/study/$sessionId` | Full-screen timer with mode UI, strike counter, อึ่ง reactions |
| `/app/battles`, `/app/battles/$id` | Challenge friends; live battle screen |
| `/app/leaderboard` | Board × scope × period tabs |
| `/app/memes` | Collection grid, rarity frames, pack opening |
| `/app/shop` | Items, boosters, skins; worm balance |
| `/app/groups/$id` | Group wall, members, group goal |
| `/app/profile/$username` | Character room, stats, showcased memes, titles |

## 13. Gamification engine

- **Worms** = `floor(minutes/5)`, ×1.2 goal-met bonus, ×streak bonus (cap 2×), ×2 with booster;
  daily earn cap; strikes reduce validated time.
- **XP/Level**: XP = validated minutes; curve `100 * level^1.5`.
- **Streak**: one increment per local day with goal met; Streak Freeze saves a miss; milestones
  at 3/7/14/30/100.
- **Meme drops**: common 60 / rare 25 / epic 12 / legendary 3, pity epic+ every 10 rolls; sources
  = milestones, battle wins, leaderboard rewards, events, packs.
- **Shame**: 3 strikes, missed goal day, or battle loss → อึ่ง shame meme post (self-deprecating,
  never insulting); Shame Shield blocks one.

## 14. Design direction

**Mascot อึ่ง** — the supplied art is now saved in the project: a mint-green blob-frog with a
thick hand-drawn black outline, smug lidded eyes, raised eyebrow, crooked smirk, and a small
"X" mouth-hands gesture. Everything keys off it:

- Palette: mascot mint as primary, warm off-white canvas, deep ink (near-black) for outlines
  and text, plus rarity accents for meme frames.
- Visual language: thick uneven marker strokes, chunky rounded cards with offset ink borders,
  slightly wobbly edges — hand-drawn meme energy, never corporate-flat.
- Typography: playful rounded display for headings + clean sans body (Thai + Latin support).
- Motion: squash-and-stretch bounce; อึ่ง reacts in the timer (focused, bored, smug, shamed)
  and appears as a sticker on shame memes and pokes.
- All colors as semantic tokens in `src/styles.css` (light + dark); expression variants of the
  mascot get generated from this base art.

## 15. Build order

1. Design system from the mascot palette, landing page, mascot expression set

2. Lovable Cloud: auth, full schema, RLS, seeds; onboarding flow
3. Subjects, tasks, files, due-today
4. Study session engine (modes, strikes, validation, rewards)
5. Feed, groups, ask for help, pokes
6. Leaderboards, meme collection, shop/inventory
7. AI quiz generation + battles
8. Cron rollover, monthly wrapped, notifications
