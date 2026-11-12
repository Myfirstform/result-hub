REVOKE ALL ON FUNCTION public.lookup_published_student_result(uuid, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_published_student_result(uuid, text, text) TO anon;