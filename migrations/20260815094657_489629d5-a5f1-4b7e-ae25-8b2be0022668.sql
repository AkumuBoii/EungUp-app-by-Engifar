-- ============ enums ============
create type public.app_role as enum ('admin','moderator','user');
create type public.study_mode as enum ('stopwatch','countdown','task_focus');
create type public.task_status as enum ('todo','in_progress','submitted','done');
create type public.meme_rarity as enum ('common','rare','epic','legendary');
create type public.post_type as enum ('session','milestone','task_done','shame','help','battle','leaderboard','system');

-- ============ helpers ============
create or replace function public.update_updated_at_column()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- ============ profiles ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  mascot_skin text not null default 'classic',
  avatar_url text,
  worms integer not null default 0,
  xp integer not null default 0,
  level integer not null default 1,
  daily_goal_min integer not null default 60,
  timezone text not null default 'Asia/Bangkok',
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant select on public.profiles to anon;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable by signed in users" on public.profiles for select to authenticated using (true);
create policy "users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "users update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create trigger profiles_updated_at before update on public.profiles for each row execute function public.update_updated_at_column();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  insert into public.streaks (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end; $$;

-- ============ roles ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

-- ============ groups ============
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  join_code text not null unique default upper(substr(md5(random()::text),1,6)),
  owner_id uuid not null references auth.users(id) on delete cascade,
  avatar_url text,
  created_at timestamptz not null default now()
);
create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
grant select, insert, update, delete on public.groups to authenticated;
grant select, insert, delete on public.group_members to authenticated;
grant all on public.groups, public.group_members to service_role;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

create or replace function public.is_group_member(_group_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.group_members where group_id = _group_id and user_id = _user_id);
$$;

create policy "groups readable by signed in users" on public.groups for select to authenticated using (true);
create policy "users create groups" on public.groups for insert to authenticated with check (auth.uid() = owner_id);
create policy "owner updates group" on public.groups for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owner deletes group" on public.groups for delete to authenticated using (auth.uid() = owner_id);
create policy "members read membership" on public.group_members for select to authenticated using (public.is_group_member(group_id, auth.uid()) or auth.uid() = user_id);
create policy "users join groups" on public.group_members for insert to authenticated with check (auth.uid() = user_id);
create policy "users leave groups" on public.group_members for delete to authenticated using (auth.uid() = user_id);

-- ============ subjects & tasks ============
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default 'mint',
  icon text,
  created_at timestamptz not null default now()
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  description text,
  due_at timestamptz,
  status public.task_status not null default 'todo',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.task_files (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  filename text not null,
  kind text not null default 'notes',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.subjects, public.tasks, public.task_files to authenticated;
grant all on public.subjects, public.tasks, public.task_files to service_role;
alter table public.subjects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_files enable row level security;
create policy "own subjects" on public.subjects for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own tasks" on public.tasks for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own task files" on public.task_files for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger tasks_updated_at before update on public.tasks for each row execute function public.update_updated_at_column();

-- ============ sessions & stats ============
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  subject_id uuid references public.subjects(id) on delete set null,
  mode public.study_mode not null default 'stopwatch',
  target_sec integer,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_sec integer not null default 0,
  strikes integer not null default 0,
  worms_awarded integer not null default 0,
  xp_awarded integer not null default 0,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.daily_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  total_sec integer not null default 0,
  goal_sec integer not null default 3600,
  goal_met boolean not null default false,
  primary key (user_id, day)
);
create table public.subject_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  total_sec integer not null default 0,
  sessions integer not null default 0,
  primary key (user_id, subject_id)
);
create table public.streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current integer not null default 0,
  longest integer not null default 0,
  last_active_day date,
  freezes_left integer not null default 1
);
grant select, insert, update, delete on public.study_sessions to authenticated;
grant select on public.daily_stats, public.subject_stats, public.streaks to authenticated;
grant all on public.study_sessions, public.daily_stats, public.subject_stats, public.streaks to service_role;
alter table public.study_sessions enable row level security;
alter table public.daily_stats enable row level security;
alter table public.subject_stats enable row level security;
alter table public.streaks enable row level security;
create policy "own sessions" on public.study_sessions for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "read daily stats" on public.daily_stats for select to authenticated using (true);
create policy "read subject stats" on public.subject_stats for select to authenticated using (auth.uid() = user_id);
create policy "read streaks" on public.streaks for select to authenticated using (true);

-- ============ memes, shop, wallet ============
create table public.memes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  caption text,
  image_url text,
  rarity public.meme_rarity not null default 'common',
  created_at timestamptz not null default now()
);
create table public.user_memes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meme_id uuid not null references public.memes(id) on delete cascade,
  source text not null default 'drop',
  obtained_at timestamptz not null default now(),
  unique (user_id, meme_id)
);
create table public.shop_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  kind text not null,
  price_worms integer not null,
  payload jsonb not null default '{}'::jsonb,
  active boolean not null default true
);
create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.shop_items(id) on delete cascade,
  qty integer not null default 1,
  equipped boolean not null default false,
  active_until timestamptz,
  unique (user_id, item_id)
);
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta_worms integer not null,
  reason text not null,
  ref_id uuid,
  created_at timestamptz not null default now()
);
grant select on public.memes, public.shop_items to authenticated;
grant select on public.memes, public.shop_items to anon;
grant select, insert on public.user_memes to authenticated;
grant select on public.inventory, public.transactions to authenticated;
grant all on public.memes, public.user_memes, public.shop_items, public.inventory, public.transactions to service_role;
alter table public.memes enable row level security;
alter table public.user_memes enable row level security;
alter table public.shop_items enable row level security;
alter table public.inventory enable row level security;
alter table public.transactions enable row level security;
create policy "meme catalog public" on public.memes for select using (true);
create policy "shop public" on public.shop_items for select using (true);
create policy "collections readable" on public.user_memes for select to authenticated using (true);
create policy "own inventory" on public.inventory for select to authenticated using (auth.uid() = user_id);
create policy "own transactions" on public.transactions for select to authenticated using (auth.uid() = user_id);

-- ============ social feed ============
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid references public.groups(id) on delete set null,
  type public.post_type not null default 'session',
  body text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null default '🐸',
  created_at timestamptz not null default now(),
  unique (post_id, user_id, emoji)
);
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create table public.pokes (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  meme_id uuid references public.memes(id) on delete set null,
  message text,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.posts, public.reactions, public.comments, public.pokes to authenticated;
grant all on public.posts, public.reactions, public.comments, public.pokes to service_role;
alter table public.posts enable row level security;
alter table public.reactions enable row level security;
alter table public.comments enable row level security;
alter table public.pokes enable row level security;
create policy "feed readable" on public.posts for select to authenticated using (true);
create policy "own posts insert" on public.posts for insert to authenticated with check (auth.uid() = user_id);
create policy "own posts delete" on public.posts for delete to authenticated using (auth.uid() = user_id);
create policy "reactions readable" on public.reactions for select to authenticated using (true);
create policy "own reactions" on public.reactions for insert to authenticated with check (auth.uid() = user_id);
create policy "remove own reactions" on public.reactions for delete to authenticated using (auth.uid() = user_id);
create policy "comments readable" on public.comments for select to authenticated using (true);
create policy "own comments" on public.comments for insert to authenticated with check (auth.uid() = user_id);
create policy "delete own comments" on public.comments for delete to authenticated using (auth.uid() = user_id);
create policy "pokes readable" on public.pokes for select to authenticated using (auth.uid() = to_user or auth.uid() = from_user);
create policy "send pokes" on public.pokes for insert to authenticated with check (auth.uid() = from_user);

-- ============ leaderboard snapshots ============
create table public.leaderboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  period text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  rank integer not null,
  value integer not null,
  captured_at timestamptz not null default now()
);
grant select on public.leaderboard_snapshots to authenticated;
grant all on public.leaderboard_snapshots to service_role;
alter table public.leaderboard_snapshots enable row level security;
create policy "leaderboards readable" on public.leaderboard_snapshots for select to authenticated using (true);

-- ============ seeds ============
insert into public.memes (slug, title, caption, rarity) values
  ('ueng-focus','Focused อึ่ง','one more page and I sleep','common'),
  ('ueng-smug','Smug อึ่ง','studied before you woke up','common'),
  ('ueng-panic','Panic อึ่ง','exam is tomorrow???','common'),
  ('ueng-sleepy','Sleepy อึ่ง','my eyes are closed but I am reading','common'),
  ('ueng-coffee','Caffeinated อึ่ง','sleep is a side quest','rare'),
  ('ueng-genius','Galaxy Brain อึ่ง','I understood the whole chapter','rare'),
  ('ueng-shame','Shame อึ่ง','opened TikTok during study','rare'),
  ('ueng-champion','Champion อึ่ง','top of the leaderboard','epic'),
  ('ueng-streak','Streak Lord อึ่ง','30 days no miss','epic'),
  ('ueng-legend','Legendary อึ่ง','the frog that never blinked','legendary');

insert into public.shop_items (slug, name, description, kind, price_worms, payload) values
  ('skin-classic','Classic อึ่ง','The original mint blob','skin',0,'{"skin":"classic"}'),
  ('skin-cyber','Cyber อึ่ง','Neon visor edition','skin',300,'{"skin":"cyber"}'),
  ('skin-scholar','Scholar อึ่ง','Tiny graduation cap','skin',250,'{"skin":"scholar"}'),
  ('acc-headphones','Study Headphones','Lo-fi ready accessory','accessory',120,'{"accessory":"headphones"}'),
  ('deco-lamp','Desk Lamp','Warm glow for the study room','decoration',90,'{"decoration":"lamp"}'),
  ('pack-meme','Meme Pack','Roll one random meme','pack',150,'{"rolls":1}'),
  ('item-streak-freeze','Streak Freeze','Saves your streak for one missed day','consumable',200,'{"effect":"streak_freeze"}'),
  ('item-shame-shield','Shame Shield','Blocks one shame post','consumable',180,'{"effect":"shame_shield"}'),
  ('item-double-worms','Double Worm Booster','2x worms for 24 hours','consumable',350,'{"effect":"double_worms","hours":24}');