
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'institution_admin');

-- 2. Institutions table
CREATE TABLE public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  contact_email TEXT,
  contact_phone TEXT,
  footer_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- 4. Institution admins table
CREATE TABLE public.institution_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, institution_id)
);

-- 5. Student results table
CREATE TABLE public.student_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  register_number TEXT NOT NULL,
  secret_code TEXT NOT NULL,
  student_name TEXT NOT NULL,
  class TEXT,
  subjects JSONB DEFAULT '[]'::jsonb,
  total NUMERIC,
  grade TEXT,
  rank TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Access logs table
CREATE TABLE public.access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  register_number TEXT NOT NULL,
  searched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Indexes
CREATE INDEX idx_student_results_lookup ON public.student_results (institution_id, register_number, secret_code);
CREATE INDEX idx_student_results_institution ON public.student_results (institution_id);
CREATE INDEX idx_institutions_slug ON public.institutions (slug);
CREATE INDEX idx_access_logs_institution ON public.access_logs (institution_id);
CREATE INDEX idx_user_roles_user ON public.user_roles (user_id);
CREATE INDEX idx_institution_admins_user ON public.institution_admins (user_id);
CREATE INDEX idx_institution_admins_institution ON public.institution_admins (institution_id);

-- 8. Enable RLS on all tables
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- 9. Security definer helper functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_institution_id_for_admin(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT institution_id FROM public.institution_admins
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 10. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_institutions_updated_at
  BEFORE UPDATE ON public.institutions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_results_updated_at
  BEFORE UPDATE ON public.student_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. RLS Policies for institutions
CREATE POLICY "Super admins can do everything with institutions"
  ON public.institutions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Institution admins can view their own institution"
  ON public.institutions FOR SELECT
  TO authenticated
  USING (id = public.get_institution_id_for_admin(auth.uid()));

CREATE POLICY "Anon can view active institutions by slug"
  ON public.institutions FOR SELECT
  TO anon
  USING (status = 'active');

-- 12. RLS Policies for user_roles
CREATE POLICY "Super admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can read their own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 13. RLS Policies for institution_admins
CREATE POLICY "Super admins can manage all institution admins"
  ON public.institution_admins FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Institution admins can view their own mapping"
  ON public.institution_admins FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 14. RLS Policies for student_results
CREATE POLICY "Super admins can do everything with results"
  ON public.student_results FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Institution admins can manage their own results"
  ON public.student_results FOR ALL
  TO authenticated
  USING (institution_id = public.get_institution_id_for_admin(auth.uid()))
  WITH CHECK (institution_id = public.get_institution_id_for_admin(auth.uid()));

CREATE POLICY "Anon can view published results for active institutions"
  ON public.student_results FOR SELECT
  TO anon
  USING (
    published = true
    AND EXISTS (
      SELECT 1 FROM public.institutions
      WHERE id = institution_id AND status = 'active'
    )
  );

-- 15. RLS Policies for access_logs
CREATE POLICY "Super admins can view all access logs"
  ON public.access_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Institution admins can manage their own logs"
  ON public.access_logs FOR ALL
  TO authenticated
  USING (institution_id = public.get_institution_id_for_admin(auth.uid()))
  WITH CHECK (institution_id = public.get_institution_id_for_admin(auth.uid()));

CREATE POLICY "Anon can insert access logs"
  ON public.access_logs FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.institutions
      WHERE id = institution_id AND status = 'active'
    )
  );
