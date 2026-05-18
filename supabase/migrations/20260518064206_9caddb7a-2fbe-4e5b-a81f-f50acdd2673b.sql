
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.account_type AS ENUM ('asset','liability','equity','revenue','expense');
CREATE TYPE public.normal_balance AS ENUM ('D','K');
CREATE TYPE public.journal_status AS ENUM ('draft','posted','void');

-- ============================================================
-- COA TEMPLATES (global & per jenis_unit)
-- ============================================================
CREATE TABLE public.coa_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('global','unit')),
  jenis_unit unit_jenis,
  kode TEXT NOT NULL,
  nama TEXT NOT NULL,
  tipe account_type NOT NULL,
  normal_balance normal_balance NOT NULL,
  parent_kode TEXT,
  level INT NOT NULL DEFAULT 1,
  is_header BOOLEAN NOT NULL DEFAULT false,
  is_postable BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(scope, jenis_unit, kode)
);
ALTER TABLE public.coa_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated reads templates" ON public.coa_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin manages templates" ON public.coa_templates FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

-- ============================================================
-- CHART OF ACCOUNTS (per tenant)
-- ============================================================
CREATE TABLE public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  unit_id UUID,
  kode TEXT NOT NULL,
  nama TEXT NOT NULL,
  tipe account_type NOT NULL,
  normal_balance normal_balance NOT NULL,
  parent_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  level INT NOT NULL DEFAULT 1,
  is_header BOOLEAN NOT NULL DEFAULT false,
  is_postable BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_from_template BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, kode)
);
CREATE INDEX idx_coa_tenant ON public.chart_of_accounts(tenant_id);
CREATE INDEX idx_coa_parent ON public.chart_of_accounts(parent_id);
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin full access coa" ON public.chart_of_accounts FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "Tenant members view coa" ON public.chart_of_accounts FOR SELECT TO authenticated
  USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Tenant admins manage coa" ON public.chart_of_accounts FOR ALL TO authenticated
  USING (is_tenant_member(auth.uid(), tenant_id) AND (has_role(auth.uid(),'direktur_bumdes') OR has_role(auth.uid(),'admin_bumdes')))
  WITH CHECK (is_tenant_member(auth.uid(), tenant_id) AND (has_role(auth.uid(),'direktur_bumdes') OR has_role(auth.uid(),'admin_bumdes')));

-- ============================================================
-- JOURNALS
-- ============================================================
CREATE TABLE public.journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  unit_id UUID,
  nomor TEXT NOT NULL,
  tanggal DATE NOT NULL,
  deskripsi TEXT,
  reference_type TEXT,
  reference_id UUID,
  status journal_status NOT NULL DEFAULT 'draft',
  posted_at TIMESTAMPTZ,
  posted_by UUID,
  voided_at TIMESTAMPTZ,
  voided_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, nomor)
);
CREATE INDEX idx_journals_tenant ON public.journals(tenant_id);
CREATE INDEX idx_journals_tanggal ON public.journals(tanggal);
CREATE INDEX idx_journals_status ON public.journals(status);
ALTER TABLE public.journals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin full access journals" ON public.journals FOR ALL TO authenticated
  USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "Tenant members view journals" ON public.journals FOR SELECT TO authenticated
  USING (is_tenant_member(auth.uid(), tenant_id));
CREATE POLICY "Tenant operators manage journals" ON public.journals FOR ALL TO authenticated
  USING (is_tenant_member(auth.uid(), tenant_id) AND (
    has_role(auth.uid(),'direktur_bumdes') OR has_role(auth.uid(),'admin_bumdes') OR
    has_role(auth.uid(),'manager_unit') OR has_role(auth.uid(),'operator_unit') OR has_role(auth.uid(),'kasir')
  ))
  WITH CHECK (is_tenant_member(auth.uid(), tenant_id) AND (
    has_role(auth.uid(),'direktur_bumdes') OR has_role(auth.uid(),'admin_bumdes') OR
    has_role(auth.uid(),'manager_unit') OR has_role(auth.uid(),'operator_unit') OR has_role(auth.uid(),'kasir')
  ));

-- ============================================================
-- JOURNAL ITEMS
-- ============================================================
CREATE TABLE public.journal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL REFERENCES public.journals(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE RESTRICT,
  debit NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (debit >= 0),
  kredit NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (kredit >= 0),
  deskripsi TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (NOT (debit > 0 AND kredit > 0))
);
CREATE INDEX idx_ji_journal ON public.journal_items(journal_id);
CREATE INDEX idx_ji_account ON public.journal_items(account_id);
ALTER TABLE public.journal_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Items follow journal access" ON public.journal_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.journals j WHERE j.id = journal_id AND (
    is_super_admin(auth.uid()) OR is_tenant_member(auth.uid(), j.tenant_id)
  )))
  WITH CHECK (EXISTS (SELECT 1 FROM public.journals j WHERE j.id = journal_id AND (
    is_super_admin(auth.uid()) OR is_tenant_member(auth.uid(), j.tenant_id)
  )));

-- ============================================================
-- ACCOUNT BALANCES
-- ============================================================
CREATE TABLE public.account_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  unit_id UUID,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE,
  period_year INT NOT NULL,
  period_month INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  opening_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  debit_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  kredit_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  closing_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, period_year, period_month)
);
CREATE INDEX idx_ab_tenant_period ON public.account_balances(tenant_id, period_year, period_month);
ALTER TABLE public.account_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin reads balances" ON public.account_balances FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()));
CREATE POLICY "Tenant members view balances" ON public.account_balances FOR SELECT TO authenticated
  USING (is_tenant_member(auth.uid(), tenant_id));

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Generate next child kode under a parent (or top-level if parent NULL)
CREATE OR REPLACE FUNCTION public.generate_next_account_code(_tenant_id UUID, _parent_id UUID)
RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  parent_kode TEXT;
  parent_level INT;
  prefix TEXT;
  max_suffix INT;
  next_suffix INT;
  new_kode TEXT;
BEGIN
  IF _parent_id IS NULL THEN
    SELECT COALESCE(MAX((kode)::INT), 0) INTO max_suffix
    FROM public.chart_of_accounts
    WHERE tenant_id = _tenant_id AND parent_id IS NULL AND kode ~ '^[0-9]+$';
    RETURN (max_suffix + 1)::TEXT;
  END IF;

  SELECT kode, level INTO parent_kode, parent_level
  FROM public.chart_of_accounts WHERE id = _parent_id AND tenant_id = _tenant_id;
  IF parent_kode IS NULL THEN RAISE EXCEPTION 'Parent account not found'; END IF;

  prefix := parent_kode || '.';
  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(substring(kode FROM length(prefix)+1), '\..*$', ''), '')::INT
  ), 0) INTO max_suffix
  FROM public.chart_of_accounts
  WHERE tenant_id = _tenant_id AND parent_id = _parent_id;

  next_suffix := max_suffix + 1;
  -- pad: level 1 = 1 digit, level >=2 = 2 digits
  IF parent_level >= 1 THEN
    new_kode := prefix || LPAD(next_suffix::TEXT, 2, '0');
  ELSE
    new_kode := prefix || next_suffix::TEXT;
  END IF;
  RETURN new_kode;
END; $$;

-- Seed COA from templates into a tenant
CREATE OR REPLACE FUNCTION public.seed_tenant_coa(_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  t RECORD;
  parent_uuid UUID;
BEGIN
  -- Insert global templates ordered by kode length then kode (parents first)
  FOR t IN
    SELECT * FROM public.coa_templates
    WHERE scope = 'global'
    ORDER BY length(kode), kode
  LOOP
    parent_uuid := NULL;
    IF t.parent_kode IS NOT NULL THEN
      SELECT id INTO parent_uuid FROM public.chart_of_accounts
      WHERE tenant_id = _tenant_id AND kode = t.parent_kode;
    END IF;
    INSERT INTO public.chart_of_accounts
      (tenant_id, kode, nama, tipe, normal_balance, parent_id, level, is_header, is_postable, is_system, created_from_template)
    VALUES
      (_tenant_id, t.kode, t.nama, t.tipe, t.normal_balance, parent_uuid, t.level, t.is_header, t.is_postable, true, true)
    ON CONFLICT (tenant_id, kode) DO NOTHING;
  END LOOP;
END; $$;

-- Seed COA for a business unit based on its jenis_unit
CREATE OR REPLACE FUNCTION public.seed_unit_coa(_unit_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  u RECORD;
  t RECORD;
  parent_uuid UUID;
BEGIN
  SELECT * INTO u FROM public.business_units WHERE id = _unit_id;
  IF NOT FOUND THEN RETURN; END IF;

  FOR t IN
    SELECT * FROM public.coa_templates
    WHERE scope = 'unit' AND jenis_unit = u.jenis_unit
    ORDER BY length(kode), kode
  LOOP
    parent_uuid := NULL;
    IF t.parent_kode IS NOT NULL THEN
      SELECT id INTO parent_uuid FROM public.chart_of_accounts
      WHERE tenant_id = u.tenant_id AND kode = t.parent_kode;
    END IF;
    INSERT INTO public.chart_of_accounts
      (tenant_id, unit_id, kode, nama, tipe, normal_balance, parent_id, level, is_header, is_postable, is_system, created_from_template)
    VALUES
      (u.tenant_id, _unit_id, t.kode, t.nama, t.tipe, t.normal_balance, parent_uuid, t.level, t.is_header, t.is_postable, true, true)
    ON CONFLICT (tenant_id, kode) DO NOTHING;
  END LOOP;
END; $$;

-- Validate journal balance & posting rules
CREATE OR REPLACE FUNCTION public.validate_journal_balance(_journal_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  td NUMERIC; tk NUMERIC; cnt INT; header_cnt INT;
BEGIN
  SELECT COALESCE(SUM(debit),0), COALESCE(SUM(kredit),0), COUNT(*) INTO td, tk, cnt
  FROM public.journal_items WHERE journal_id = _journal_id;
  IF cnt < 2 THEN RAISE EXCEPTION 'Jurnal harus memiliki minimal 2 baris'; END IF;
  IF td <> tk OR td = 0 THEN RAISE EXCEPTION 'Debit (%) tidak sama dengan Kredit (%)', td, tk; END IF;
  SELECT COUNT(*) INTO header_cnt
  FROM public.journal_items ji JOIN public.chart_of_accounts a ON a.id = ji.account_id
  WHERE ji.journal_id = _journal_id AND (a.is_header = true OR a.is_postable = false);
  IF header_cnt > 0 THEN RAISE EXCEPTION 'Tidak boleh jurnal ke akun header / non-postable'; END IF;
END; $$;

-- Update account balances when a journal is posted/voided
CREATE OR REPLACE FUNCTION public.apply_journal_to_balances(_journal_id UUID, _direction INT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  j RECORD;
  it RECORD;
  py INT; pm INT;
BEGIN
  SELECT * INTO j FROM public.journals WHERE id = _journal_id;
  IF NOT FOUND THEN RETURN; END IF;
  py := EXTRACT(YEAR FROM j.tanggal)::INT;
  pm := EXTRACT(MONTH FROM j.tanggal)::INT;

  FOR it IN SELECT ji.*, a.normal_balance, a.tenant_id, a.unit_id
            FROM public.journal_items ji
            JOIN public.chart_of_accounts a ON a.id = ji.account_id
            WHERE ji.journal_id = _journal_id
  LOOP
    INSERT INTO public.account_balances (tenant_id, unit_id, account_id, period_year, period_month, debit_total, kredit_total, closing_balance)
    VALUES (it.tenant_id, it.unit_id, it.account_id, py, pm,
            _direction * it.debit, _direction * it.kredit,
            CASE WHEN it.normal_balance = 'D' THEN _direction * (it.debit - it.kredit)
                 ELSE _direction * (it.kredit - it.debit) END)
    ON CONFLICT (account_id, period_year, period_month) DO UPDATE
      SET debit_total = account_balances.debit_total + EXCLUDED.debit_total,
          kredit_total = account_balances.kredit_total + EXCLUDED.kredit_total,
          closing_balance = account_balances.closing_balance + EXCLUDED.closing_balance,
          updated_at = now();
  END LOOP;
END; $$;

-- Trigger: enforce status transitions & update balances
CREATE OR REPLACE FUNCTION public.journal_status_guard()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Transition rules
    IF OLD.status = 'posted' AND NEW.status = 'draft' THEN
      RAISE EXCEPTION 'Jurnal yang sudah posted tidak bisa dikembalikan ke draft. Gunakan void.';
    END IF;

    -- draft -> posted
    IF OLD.status = 'draft' AND NEW.status = 'posted' THEN
      PERFORM public.validate_journal_balance(NEW.id);
      NEW.posted_at := now();
      NEW.posted_by := auth.uid();
      PERFORM public.apply_journal_to_balances(NEW.id, 1);
    END IF;

    -- posted -> void
    IF OLD.status = 'posted' AND NEW.status = 'void' THEN
      NEW.voided_at := now();
      NEW.voided_by := auth.uid();
      PERFORM public.apply_journal_to_balances(NEW.id, -1);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_journal_status_guard BEFORE UPDATE ON public.journals
  FOR EACH ROW EXECUTE FUNCTION public.journal_status_guard();

-- Auto-seed COA when new business_unit inserted
CREATE OR REPLACE FUNCTION public.on_business_unit_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.seed_unit_coa(NEW.id);
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_business_unit_seed AFTER INSERT ON public.business_units
  FOR EACH ROW EXECUTE FUNCTION public.on_business_unit_created();

-- Patch approve_tenant_registration to also seed COA
CREATE OR REPLACE FUNCTION public.approve_tenant_registration(_registration_id uuid, _director_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  reg RECORD; new_tenant_id UUID; new_kode TEXT; seq INT;
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

  IF _director_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    VALUES (_director_user_id, 'direktur_bumdes', new_tenant_id) ON CONFLICT DO NOTHING;
    UPDATE public.profiles SET default_tenant_id = new_tenant_id WHERE id = _director_user_id;
  END IF;

  UPDATE public.tenant_registrations
  SET status='approved', reviewed_at=now(), reviewed_by=auth.uid(), tenant_id=new_tenant_id
  WHERE id = _registration_id;

  -- Seed default COA
  PERFORM public.seed_tenant_coa(new_tenant_id);

  RETURN jsonb_build_object('tenant_id', new_tenant_id, 'kode_bumdes', new_kode);
END; $$;

-- ============================================================
-- SEED COA TEMPLATES (global + per-jenis)
-- ============================================================
INSERT INTO public.coa_templates (scope, kode, nama, tipe, normal_balance, parent_kode, level, is_header, is_postable, is_system, sort_order) VALUES
-- ASET
('global','1','ASET','asset','D',NULL,1,true,false,true,1),
('global','1.1','ASET LANCAR','asset','D','1',2,true,false,true,2),
('global','1.1.01','Kas','asset','D','1.1',3,true,false,true,3),
('global','1.1.01.01','Kas Tunai','asset','D','1.1.01',4,false,true,true,4),
('global','1.1.02','Bank','asset','D','1.1',3,true,false,true,5),
('global','1.1.02.01','Bank Operasional','asset','D','1.1.02',4,false,true,true,6),
('global','1.1.03','Piutang','asset','D','1.1',3,true,false,true,7),
('global','1.1.03.01','Piutang Usaha','asset','D','1.1.03',4,false,true,true,8),
('global','1.1.04','Persediaan','asset','D','1.1',3,true,false,true,9),
('global','1.1.04.01','Persediaan Barang','asset','D','1.1.04',4,false,true,true,10),
('global','1.2','ASET TETAP','asset','D','1',2,true,false,true,11),
('global','1.2.01','Aset Tetap','asset','D','1.2',3,true,false,true,12),
('global','1.2.01.01','Peralatan','asset','D','1.2.01',4,false,true,true,13),
('global','1.2.02','Akumulasi Penyusutan','asset','K','1.2',3,true,false,true,14),
('global','1.2.02.01','Akm. Penyusutan Peralatan','asset','K','1.2.02',4,false,true,true,15),
-- LIABILITAS
('global','2','LIABILITAS','liability','K',NULL,1,true,false,true,20),
('global','2.1','LIABILITAS LANCAR','liability','K','2',2,true,false,true,21),
('global','2.1.01','Hutang','liability','K','2.1',3,true,false,true,22),
('global','2.1.01.01','Hutang Usaha','liability','K','2.1.01',4,false,true,true,23),
-- EKUITAS
('global','3','EKUITAS','equity','K',NULL,1,true,false,true,30),
('global','3.1','MODAL','equity','K','3',2,true,false,true,31),
('global','3.1.01','Modal Desa','equity','K','3.1',3,true,false,true,32),
('global','3.1.01.01','Modal Penyertaan Desa','equity','K','3.1.01',4,false,true,true,33),
('global','3.2','LABA','equity','K','3',2,true,false,true,34),
('global','3.2.01.01','Laba Ditahan','equity','K','3.2',4,false,true,true,35),
-- PENDAPATAN
('global','4','PENDAPATAN','revenue','K',NULL,1,true,false,true,40),
('global','4.1','PENDAPATAN USAHA','revenue','K','4',2,true,false,true,41),
('global','4.1.01.01','Pendapatan Penjualan','revenue','K','4.1',4,false,true,true,42),
('global','4.1.01.02','Pendapatan Jasa','revenue','K','4.1',4,false,true,true,43),
-- BEBAN
('global','5','BEBAN','expense','D',NULL,1,true,false,true,50),
('global','5.1','HARGA POKOK PENJUALAN','expense','D','5',2,true,false,true,51),
('global','5.1.01.01','HPP','expense','D','5.1',4,false,true,true,52),
('global','5.2','BEBAN OPERASIONAL','expense','D','5',2,true,false,true,53),
('global','5.2.01.01','Beban Gaji','expense','D','5.2',4,false,true,true,54),
('global','5.2.01.02','Beban Listrik','expense','D','5.2',4,false,true,true,55),
('global','5.2.01.03','Beban Penyusutan','expense','D','5.2',4,false,true,true,56);

-- Unit-specific templates
INSERT INTO public.coa_templates (scope, jenis_unit, kode, nama, tipe, normal_balance, parent_kode, level, is_header, is_postable, is_system, sort_order) VALUES
('unit','air','4.1.02.01','Pendapatan Air Bersih','revenue','K','4.1',4,false,true,true,100),
('unit','air','5.2.02.01','Beban Pipa & Perawatan','expense','D','5.2',4,false,true,true,101),
('unit','wisata','4.1.03.01','Pendapatan Tiket Wisata','revenue','K','4.1',4,false,true,true,102),
('unit','wisata','5.2.03.01','Beban Operasional Wisata','expense','D','5.2',4,false,true,true,103),
('unit','dagang','1.1.04.02','Persediaan Dagang','asset','D','1.1.04',4,false,true,true,104),
('unit','peternakan','5.2.04.01','Beban Pakan','expense','D','5.2',4,false,true,true,105),
('unit','peternakan','5.2.04.02','Beban Kematian Ternak','expense','D','5.2',4,false,true,true,106),
('unit','simpan_pinjam','1.1.03.02','Piutang Pinjaman Anggota','asset','D','1.1.03',4,false,true,true,107),
('unit','simpan_pinjam','4.1.04.01','Pendapatan Bunga Pinjaman','revenue','K','4.1',4,false,true,true,108),
('unit','jasa','4.1.05.01','Pendapatan Jasa','revenue','K','4.1',4,false,true,true,109);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chart_of_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.journals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.journal_items;
