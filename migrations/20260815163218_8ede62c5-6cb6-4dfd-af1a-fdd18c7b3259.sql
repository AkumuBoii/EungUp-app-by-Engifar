ALTER TABLE public.battles
  ADD COLUMN IF NOT EXISTS quiz_size integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

CREATE OR REPLACE FUNCTION public.is_battle_participant(_battle_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.battles b
    WHERE b.id = _battle_id AND (b.challenger_id = _user_id OR b.opponent_id = _user_id)
  )
$$;
REVOKE ALL ON FUNCTION public.is_battle_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_battle_participant(uuid, uuid) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.battle_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id uuid NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (battle_id, task_id)
);
GRANT SELECT, INSERT, DELETE ON public.battle_tasks TO authenticated;
GRANT ALL ON public.battle_tasks TO service_role;
ALTER TABLE public.battle_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "battle_tasks_read" ON public.battle_tasks FOR SELECT TO authenticated
  USING (public.is_battle_participant(battle_id, auth.uid()));
CREATE POLICY "battle_tasks_write" ON public.battle_tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_battle_participant(battle_id, auth.uid()));

CREATE TABLE IF NOT EXISTS public.battle_bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id uuid NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meme_id uuid NOT NULL REFERENCES public.memes(id) ON DELETE CASCADE,
  settled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (battle_id, user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.battle_bets TO authenticated;
GRANT ALL ON public.battle_bets TO service_role;
ALTER TABLE public.battle_bets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "battle_bets_read" ON public.battle_bets FOR SELECT TO authenticated
  USING (public.is_battle_participant(battle_id, auth.uid()));
CREATE POLICY "battle_bets_write" ON public.battle_bets FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_battle_participant(battle_id, auth.uid()));

CREATE TABLE IF NOT EXISTS public.battle_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id uuid NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  max_score integer NOT NULL DEFAULT 0,
  duration_sec integer NOT NULL DEFAULT 0,
  distractions integer NOT NULL DEFAULT 0,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (battle_id, user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.battle_results TO authenticated;
GRANT ALL ON public.battle_results TO service_role;
ALTER TABLE public.battle_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "battle_results_read" ON public.battle_results FOR SELECT TO authenticated
  USING (public.is_battle_participant(battle_id, auth.uid()));
CREATE POLICY "battle_results_write" ON public.battle_results FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_battle_participant(battle_id, auth.uid()));
CREATE POLICY "battle_results_update" ON public.battle_results FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());