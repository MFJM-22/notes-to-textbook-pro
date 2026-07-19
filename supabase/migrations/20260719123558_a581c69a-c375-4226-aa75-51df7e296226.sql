
CREATE TABLE public.weeks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  week_number integer NOT NULL,
  title text NOT NULL DEFAULT '',
  overview text NOT NULL DEFAULT '',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weeks TO authenticated;
GRANT ALL ON public.weeks TO service_role;
ALTER TABLE public.weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY weeks_own_all ON public.weeks FOR ALL USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE TRIGGER weeks_updated_at BEFORE UPDATE ON public.weeks FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX weeks_book_idx ON public.weeks(book_id, order_index);

CREATE TABLE public.topics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_id uuid NOT NULL REFERENCES public.weeks(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  heading text NOT NULL DEFAULT '',
  body_markdown text NOT NULL DEFAULT '',
  objectives text[] NOT NULL DEFAULT '{}',
  activities text[] NOT NULL DEFAULT '{}',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.topics TO authenticated;
GRANT ALL ON public.topics TO service_role;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY topics_own_all ON public.topics FOR ALL USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE TRIGGER topics_updated_at BEFORE UPDATE ON public.topics FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX topics_week_idx ON public.topics(week_id, order_index);

CREATE TABLE public.glossary_terms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  source_week_id uuid REFERENCES public.weeks(id) ON DELETE SET NULL,
  term text NOT NULL,
  definition text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.glossary_terms TO authenticated;
GRANT ALL ON public.glossary_terms TO service_role;
ALTER TABLE public.glossary_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY glossary_own_all ON public.glossary_terms FOR ALL USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE TRIGGER glossary_updated_at BEFORE UPDATE ON public.glossary_terms FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE INDEX glossary_book_idx ON public.glossary_terms(book_id);
