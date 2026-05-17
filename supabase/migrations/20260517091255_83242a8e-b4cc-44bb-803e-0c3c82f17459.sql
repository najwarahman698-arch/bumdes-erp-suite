
-- ============ ENUMS ============
CREATE TYPE public.tenant_status AS ENUM ('pending','active','suspended');
CREATE TYPE public.registration_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.app_role AS ENUM ('super_admin_platform','direktur_bumdes','admin_bumdes','manager_unit','operator_unit','kasir');
CREATE TYPE public.unit_jenis AS ENUM ('wisata','simpan_pinjam','air','dagang','peternakan','jasa','lainnya');

-- ============ TENANTS ============
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_bumdes TEXT NOT NULL,
  kode_bumdes TEXT NOT NULL UNIQUE,
  nama_desa TEXT NOT NULL,
  nama_kecamatan TEXT NOT NULL,
  alamat TEXT,
  nomor_whatsapp TEXT,
  email TEXT,
  status public.tenant_status NOT NULL DEFAULT 'active',
  subscription_status TEXT DEFAULT 'trial',
  expired_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ REGISTRATIONS ============
CREATE TABLE public.tenant_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  nama_desa TEXT NOT NULL,
  nama_kecamatan TEXT NOT NULL,
  nama_bumdes TEXT NOT NULL,
  nama_pemohon TEXT NOT NULL,
  gender TEXT,
  agama TEXT,
  alamat TEXT,
  nomor_whatsapp TEXT,
  email_akses TEXT NOT NULL,
  status public.registration_status NOT NULL DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  rejection_reason TEXT,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ BUSINESS UNITS ============
CREATE TABLE public.business_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kode_unit TEXT NOT NULL,
  nama_unit TEXT NOT NULL,
  jenis_unit public.unit_jenis NOT NULL DEFAULT 'lainnya',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, kode_unit)
);

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  default_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.business_units(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX user_roles_unique_idx ON public.user_roles (user_id, role, COALESCE(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid), COALESCE(unit_id,'00000000-0000-0000-0000-000000000000'::uuid));

-- ============ SECURITY DEFINER FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin_platform')
$$;

CREATE OR REPLACE FUNCTION public.is_tenant_member(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND tenant_id = _tenant_id)
$$;

-- ============ ENABLE RLS ============
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ POLICIES: tenants ============
CREATE POLICY "Super admin full access tenants" ON public.tenants
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Tenant members can view their tenant" ON public.tenants
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), id));

-- ============ POLICIES: tenant_registrations ============
-- Anyone (even unauthenticated) can submit a registration
CREATE POLICY "Anyone can submit registration" ON public.tenant_registrations
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Super admin views registrations" ON public.tenant_registrations
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin updates registrations" ON public.tenant_registrations
  FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid()));

-- ============ POLICIES: business_units ============
CREATE POLICY "Super admin full access units" ON public.business_units
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Tenant members view units" ON public.business_units
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id));

CREATE POLICY "Tenant admins manage units" ON public.business_units
  FOR ALL TO authenticated
  USING (public.is_tenant_member(auth.uid(), tenant_id) AND (public.has_role(auth.uid(),'direktur_bumdes') OR public.has_role(auth.uid(),'admin_bumdes')))
  WITH CHECK (public.is_tenant_member(auth.uid(), tenant_id) AND (public.has_role(auth.uid(),'direktur_bumdes') OR public.has_role(auth.uid(),'admin_bumdes')));

-- ============ POLICIES: profiles ============
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "Super admin views all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

-- ============ POLICIES: user_roles ============
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Super admin manages roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ============ TRIGGER: auto profile + bootstrap super admin ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  has_super BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;

  -- Bootstrap: first super admin
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role='super_admin_platform') INTO has_super;
  IF NEW.email = 'superadmin@gmail.com' AND NOT has_super THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin_platform');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ APPROVAL RPC ============
CREATE OR REPLACE FUNCTION public.approve_tenant_registration(_registration_id UUID, _director_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  reg RECORD;
  new_tenant_id UUID;
  new_kode TEXT;
  seq INT;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admin can approve registrations';
  END IF;

  SELECT * INTO reg FROM public.tenant_registrations WHERE id = _registration_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Registration not found'; END IF;
  IF reg.status <> 'pending' THEN RAISE EXCEPTION 'Registration already processed'; END IF;

  SELECT COUNT(*)+1 INTO seq FROM public.tenants;
  new_kode := 'BUM-' || LPAD(seq::TEXT, 4, '0');

  INSERT INTO public.tenants (nama_bumdes, kode_bumdes, nama_desa, nama_kecamatan, alamat, nomor_whatsapp, email, status, approved_at, approved_by)
  VALUES (reg.nama_bumdes, new_kode, reg.nama_desa, reg.nama_kecamatan, reg.alamat, reg.nomor_whatsapp, reg.email_akses, 'active', now(), auth.uid())
  RETURNING id INTO new_tenant_id;

  -- Assign director role if user id provided
  IF _director_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (_director_user_id, 'direktur_bumdes', new_tenant_id)
    ON CONFLICT DO NOTHING;

    UPDATE public.profiles SET default_tenant_id = new_tenant_id WHERE id = _director_user_id;
  END IF;

  UPDATE public.tenant_registrations
  SET status='approved', reviewed_at=now(), reviewed_by=auth.uid(), tenant_id=new_tenant_id
  WHERE id = _registration_id;

  RETURN jsonb_build_object('tenant_id', new_tenant_id, 'kode_bumdes', new_kode);
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_tenant_registration(_registration_id UUID, _reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admin can reject registrations';
  END IF;
  UPDATE public.tenant_registrations
  SET status='rejected', reviewed_at=now(), reviewed_by=auth.uid(), rejection_reason=_reason
  WHERE id = _registration_id AND status='pending';
END;
$$;

-- Realtime for registrations
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenant_registrations;
