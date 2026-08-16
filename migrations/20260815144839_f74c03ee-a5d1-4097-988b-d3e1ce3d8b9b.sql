-- 1. groups -> classes
alter table public.groups rename to classes;
alter table public.group_members rename to class_members;
alter table public.class_members rename column group_id to class_id;
alter table public.posts rename column group_id to class_id;

alter table public.classes add column if not exists invite_code text;
update public.classes set invite_code = coalesce(invite_code, 'CLS-' || upper(substr(md5(random()::text), 1, 4)));
alter table public.classes alter column invite_code set not null;
create unique index if not exists classes_invite_code_key on public.classes (invite_code);

drop policy if exists "members read membership" on public.class_members;
drop function if exists public.is_group_member(uuid, uuid);
create or replace function public.is_class_member(_class_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $$ select exists (select 1 from public.class_members where class_id = _class_id and user_id = _user_id); $$;
revoke all on function public.is_class_member(uuid, uuid) from public, anon;
grant execute on function public.is_class_member(uuid, uuid) to authenticated, service_role;

create policy "members read membership" on public.class_members for select to authenticated
  using (public.is_class_member(class_id, auth.uid()) or auth.uid() = user_id);

-- 2. shop -> gachapon prize pool
alter table public.shop_items rename to gacha_items;
alter table public.gacha_items add column if not exists rarity meme_rarity not null default 'common';
alter table public.gacha_items add column if not exists category text not null default 'misc';
alter table public.gacha_items add column if not exists weight integer not null default 10;

alter table public.inventory rename constraint inventory_item_id_fkey to inventory_gacha_item_id_fkey;

alter table public.profiles add column if not exists total_rolls integer not null default 0;
alter table public.profiles add column if not exists pity_epic integer not null default 0;
alter table public.profiles add column if not exists pity_legendary integer not null default 0;

create table if not exists public.gacha_pulls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid references public.gacha_items(id) on delete set null,
  meme_id uuid references public.memes(id) on delete set null,
  name text not null,
  rarity meme_rarity not null default 'common',
  category text not null default 'misc',
  pity_hit boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.gacha_pulls to authenticated;
grant all on public.gacha_pulls to service_role;
alter table public.gacha_pulls enable row level security;
create policy "own pulls" on public.gacha_pulls for select to authenticated using (auth.uid() = user_id);

-- 3. seed the prize pool
delete from public.gacha_items;
insert into public.gacha_items (slug, name, description, kind, price_worms, rarity, category, weight, payload) values
  ('skin-classic','Classic อึ่ง','The original smug frog.','skin',0,'common','character',10,'{"skin":"classic"}'),
  ('skin-hype','Hype อึ่ง','Maximum enthusiasm frog.','skin',0,'rare','character',10,'{"skin":"hype"}'),
  ('skin-sleepy','Sleepy อึ่ง','Studying at 3am energy.','skin',0,'rare','character',10,'{"skin":"sleepy"}'),
  ('skin-golden','Golden อึ่ง','Shimmering legendary frog.','skin',0,'legendary','character',10,'{"skin":"golden"}'),
  ('skin-void','Void อึ่ง','Absorbs all distractions.','skin',0,'epic','character',10,'{"skin":"void"}'),
  ('hat-cap','Backwards Cap','Skater frog vibes.','hat',0,'common','character',10,'{"hat":"cap"}'),
  ('hat-grad','Graduation Cap','Fake it till you graduate.','hat',0,'rare','character',10,'{"hat":"grad"}'),
  ('hat-crown','Worm Crown','Ruler of the worms.','hat',0,'legendary','character',10,'{"hat":"crown"}'),
  ('glasses-deal','Deal With It','Pixel sunglasses.','glasses',0,'rare','character',10,'{"glasses":"deal"}'),
  ('glasses-nerd','Nerd Glasses','+5 intelligence, allegedly.','glasses',0,'common','character',10,'{"glasses":"nerd"}'),
  ('outfit-hoodie','Study Hoodie','Comfort over everything.','outfit',0,'common','character',10,'{"outfit":"hoodie"}'),
  ('outfit-lab','Lab Coat','Science frog reporting.','outfit',0,'epic','character',10,'{"outfit":"lab"}'),
  ('theme-mint','Mint Study Room','Fresh minty walls.','theme',0,'common','room',10,'{"theme":"mint"}'),
  ('theme-night','Midnight Library','For nocturnal grinders.','theme',0,'rare','room',10,'{"theme":"night"}'),
  ('theme-swamp','Swamp Hideout','อึ่ง natural habitat.','theme',0,'epic','room',10,'{"theme":"swamp"}'),
  ('theme-space','Space Station','Study in orbit.','theme',0,'legendary','room',10,'{"theme":"space"}'),
  ('furn-desk','Oak Desk','Sturdy and reliable.','furniture',0,'common','room',10,'{"furniture":"desk"}'),
  ('furn-chair','Gamer Chair','RGB improves focus.','furniture',0,'rare','room',10,'{"furniture":"chair"}'),
  ('furn-lamp','Lava Lamp','Hypnotic study companion.','furniture',0,'common','room',10,'{"furniture":"lamp"}'),
  ('deco-poster','Meme Poster','Wall of fame.','decoration',0,'common','room',10,'{"decoration":"poster"}'),
  ('deco-plant','Lucky Plant','Photosynthesis buddy.','decoration',0,'rare','room',10,'{"decoration":"plant"}'),
  ('deco-trophy','Golden Worm Trophy','Proof of grinding.','decoration',0,'epic','room',10,'{"decoration":"trophy"}'),
  ('power-freeze','Streak Freeze','Saves your streak for one missed day.','power',0,'rare','power',14,'{"effect":"streak_freeze"}'),
  ('power-shield','Shame Shield','Blocks one shame post.','power',0,'rare','power',14,'{"effect":"shame_shield"}'),
  ('power-boost','Double Worm Boost','2x worms for 24 hours.','power',0,'epic','power',12,'{"effect":"double_worms","hours":24}');