-- 1. Subjects belong to a class
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS subjects_class_id_idx ON public.subjects(class_id);

DROP POLICY IF EXISTS "own subjects" ON public.subjects;
CREATE POLICY "members read class subjects" ON public.subjects FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR (class_id IS NOT NULL AND public.is_class_member(class_id, auth.uid())));
CREATE POLICY "members create class subjects" ON public.subjects FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND (class_id IS NULL OR public.is_class_member(class_id, auth.uid())));
CREATE POLICY "owner updates subject" ON public.subjects FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner deletes subject" ON public.subjects FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 2. Tasks belong to a class
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS tasks_class_id_idx ON public.tasks(class_id);

DROP POLICY IF EXISTS "own tasks" ON public.tasks;
CREATE POLICY "members read class tasks" ON public.tasks FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR (class_id IS NOT NULL AND public.is_class_member(class_id, auth.uid())));
CREATE POLICY "users create own tasks" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND (class_id IS NULL OR public.is_class_member(class_id, auth.uid())));
CREATE POLICY "users update own tasks" ON public.tasks FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users delete own tasks" ON public.tasks FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 3. Battles are class-scoped
CREATE TABLE IF NOT EXISTS public.battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  challenger_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'study_time',
  target_sec integer NOT NULL DEFAULT 3600,
  stake_worms integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  winner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  challenger_sec integer NOT NULL DEFAULT 0,
  opponent_sec integer NOT NULL DEFAULT 0,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.battles TO authenticated;
GRANT ALL ON public.battles TO service_role;

ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class members read battles" ON public.battles FOR SELECT TO authenticated
  USING (public.is_class_member(class_id, auth.uid()));
CREATE POLICY "members create battles" ON public.battles FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = challenger_id
    AND public.is_class_member(class_id, auth.uid())
    AND public.is_class_member(class_id, opponent_id)
  );
CREATE POLICY "participants update battles" ON public.battles FOR UPDATE TO authenticated
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id)
  WITH CHECK (auth.uid() = challenger_id OR auth.uid() = opponent_id);
CREATE POLICY "challenger deletes battle" ON public.battles FOR DELETE TO authenticated
  USING (auth.uid() = challenger_id);

CREATE TRIGGER battles_updated_at BEFORE UPDATE ON public.battles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS battles_class_id_idx ON public.battles(class_id);

-- 4. Feed posts readable only inside their class
DROP POLICY IF EXISTS "feed readable" ON public.posts;
CREATE POLICY "class feed readable" ON public.posts FOR SELECT TO authenticated
  USING (
    class_id IS NULL
    OR public.is_class_member(class_id, auth.uid())
  );
