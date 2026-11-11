CREATE OR REPLACE FUNCTION public.lookup_published_student_result(_institution_id uuid, _register_number text, _secret_code text)
RETURNS TABLE (
  student_name text,
  register_number text,
  class text,
  subjects jsonb,
  total numeric,
  grade text,
  rank text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sr.student_name, sr.register_number, sr.class, sr.subjects, sr.total, sr.grade, sr.rank
  FROM public.student_results AS sr
  JOIN public.institutions AS i ON i.id = sr.institution_id
  WHERE sr.institution_id = _institution_id
    AND i.status = 'active'
    AND sr.register_number = _register_number
    AND sr.secret_code = _secret_code
    AND sr.published = true
  ORDER BY sr.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_published_student_result(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lookup_published_student_result(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.lookup_published_student_result(uuid, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_published_student_result(uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.lookup_published_student_result(uuid, text, text) TO authenticated;

DROP POLICY IF EXISTS "Anon can view published results for active institutions" ON public.student_results;
REVOKE SELECT ON public.student_results FROM anon;
GRANT SELECT ON public.student_results TO authenticated;