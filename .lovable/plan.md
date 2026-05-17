
# Plan Fase 1 — ERP BUMDes Multi-Tenant Foundation

Membangun fondasi platform SaaS ERP BUMDes: pendaftaran tenant, approval oleh super admin platform, isolasi data via RLS, dan struktur role berjenjang. Modul accounting (COA, journal engine, auto-journal, inventory, fixed asset) akan dibangun di fase berikutnya di atas fondasi ini.

Stack: TanStack Start + Lovable Cloud (Supabase) + React + TypeScript + Tailwind + shadcn/ui. Repo `bumdesma` hanya dipakai sebagai referensi konsep skema — implementasi fresh di project ini.

---

## 1. Aktivasi Lovable Cloud
- Enable Lovable Cloud (Supabase backend) di project.
- Tidak ada email service di fase 1 — link approval di-copy manual dari dashboard super admin (sesuai pilihan Anda).

## 2. Schema database (migration)

**`tenants`** — 1 row per BUMDes
- id, nama_bumdes, kode_bumdes (unique), nama_desa, nama_kecamatan, alamat, nomor_whatsapp, email
- status: enum('pending','active','suspended')
- subscription_status, expired_at
- approved_at, approved_by (uuid → auth.users)
- created_at, updated_at

**`tenant_registrations`** — form pendaftaran (sebelum jadi tenant)
- id, email, nama_desa, nama_kecamatan, nama_bumdes
- nama_pemohon, gender, agama, alamat, nomor_whatsapp, email_akses
- status: enum('pending','approved','rejected')
- reviewed_at, reviewed_by, rejection_reason
- tenant_id (filled saat approved), created_at

**`business_units`**
- id, tenant_id, kode_unit, nama_unit, jenis_unit (wisata/simpan_pinjam/air/dagang/peternakan/lainnya), status, created_at

**`app_role`** (enum) — `super_admin_platform`, `direktur_bumdes`, `admin_bumdes`, `manager_unit`, `operator_unit`, `kasir`

**`user_roles`** — JANGAN simpan role di profiles (anti privilege escalation)
- id, user_id (→ auth.users), role (app_role), tenant_id (nullable — null untuk super_admin_platform), unit_id (nullable)
- unique(user_id, role, tenant_id, unit_id)

**`profiles`**
- id (= auth.users.id), full_name, phone, default_tenant_id, created_at

**SECURITY DEFINER functions** (hindari RLS recursion):
- `has_role(_user_id, _role)` → boolean
- `is_super_admin(_user_id)` → boolean
- `is_tenant_member(_user_id, _tenant_id)` → boolean
- `current_tenant_id()` → uuid (dari JWT claim atau profile default)

**RLS policies** di SEMUA tabel tenant-scoped:
- Super admin platform: full access ke `tenants`, `tenant_registrations`, `user_roles`
- User biasa: hanya bisa SELECT/INSERT/UPDATE row dimana `tenant_id = current_tenant_id()` DAN `is_tenant_member(auth.uid(), tenant_id)`
- `tenant_registrations` INSERT terbuka untuk anon (form publik), SELECT/UPDATE hanya super admin

**Trigger approval** (`approve_tenant_registration` RPC, SECURITY DEFINER):
1. Validasi caller adalah super_admin_platform
2. Insert ke `tenants` (status='active')
3. Generate kode_bumdes otomatis (BUM-001, BUM-002…)
4. Buat/link user di auth (jika email_akses belum ada → buat user dengan password sementara; jika sudah ada → link existing)
5. Insert `user_roles` (role='direktur_bumdes', tenant_id=tenant_baru)
6. Update `tenant_registrations.status='approved'`, set tenant_id
7. Return tenant_id + magic_link / temp_password untuk di-copy

## 3. Bootstrap super admin
- Seed manual: setelah `superadmin@gmail.com` sign-up pertama kali via halaman /login, kita insert row di `user_roles` (role='super_admin_platform', tenant_id=NULL) via SQL one-off.
- Tambah guard: jika tabel `user_roles` belum punya satupun super_admin_platform, user pertama yang signup dengan email `superadmin@gmail.com` otomatis di-promote (via DB trigger di `auth.users` insert).

## 4. Auth + routing

**Public routes:**
- `/` — landing page (penjelasan platform, CTA Daftar BUMDes / Login)
- `/daftar` — form pendaftaran BUMDes (insert ke `tenant_registrations`), popup sukses "Permintaan ditinjau ≤28 jam"
- `/login` — email + password (Supabase auth)

**Protected (`_authenticated` layout):**
- `beforeLoad`: cek session via supabase.auth.getUser(), redirect ke /login jika tidak ada
- Router context membawa: user, roles[], current_tenant_id

**Role-based subtree:**
- `_authenticated/_super-admin/*` — guard: `has_role('super_admin_platform')`
  - `/admin/tenants` — list semua tenant + filter status
  - `/admin/registrations` — list pendaftaran pending + tombol Approve/Reject
  - `/admin/registrations/$id` — detail + form approval, setelah approve tampilkan link akses untuk di-copy
  - `/admin/tenants/$id` — detail tenant, suspend/aktivasi, subscription

- `_authenticated/_tenant/*` — guard: ada role tenant-level (direktur/admin_bumdes)
  - `/dashboard` — overview BUMDes (placeholder fase 1, stats menyusul di fase COA)
  - `/units` — CRUD business_units
  - `/users` — invite user ke tenant, assign role unit

## 5. Server functions (createServerFn)
Semua tulis-data lewat server fn dengan `requireSupabaseAuth` middleware:
- `submitRegistration` (public, tanpa auth) — insert tenant_registrations
- `listRegistrations` (super admin only) — query pending
- `approveRegistration(id)` — panggil RPC `approve_tenant_registration`, return access link
- `rejectRegistration(id, reason)`
- `suspendTenant(id)` / `activateTenant(id)`
- `createBusinessUnit({tenant_id, ...})` — guard role
- `listMyTenantUnits()` — scoped via RLS

## 6. UI components
- Landing page sederhana, professional, Tailwind + shadcn
- Form daftar dengan validasi zod
- Dashboard super admin dengan Table shadcn untuk registrations & tenants
- Toast notifications (sonner) untuk feedback aksi
- Realtime: subscribe ke `tenant_registrations` di dashboard super admin supaya pendaftaran baru muncul tanpa refresh

## 7. Testing manual flow
1. User A signup `superadmin@gmail.com` → otomatis super_admin_platform
2. Visitor isi /daftar → muncul di dashboard super admin
3. Super admin klik Approve → tenant created, user direktur created, link di-copy
4. Buka link → login sebagai direktur → masuk dashboard tenant
5. Direktur buat business unit
6. Verifikasi: login user tenant lain TIDAK bisa lihat data tenant pertama (RLS check)

---

## Catatan teknis
- Semua role check via `has_role()` SECURITY DEFINER untuk hindari RLS recursion
- `user_roles` adalah satu-satunya source of truth untuk authorization
- Tidak ada hardcoded admin di kode frontend
- Email akses dikirim manual (copy-paste link) di fase 1; integrasi email Lovable bisa ditambahkan kapan saja nanti
- Tabel COA, journals, journal_items, inventory, fixed_assets sengaja TIDAK dibuat di fase 1 — akan dibangun di Fase 2 setelah fondasi multi-tenant terbukti aman

## Fase berikutnya (tidak dikerjakan sekarang)
- **Fase 2**: COA hierarkis 1.1.01.01 + auto-generate kode + template COA global & per jenis unit + tree-view UI
- **Fase 3**: Journal engine (draft/posted/void) + account_balances + laporan dasar (Neraca, L/R, Buku Besar, Trial Balance)
- **Fase 4**: Auto-journal untuk transaksi operasional (penjualan, pembelian, bayar hutang/piutang)
- **Fase 5**: Inventory + HPP otomatis
- **Fase 6**: Fixed asset + run depreciation
- **Fase 7**: Email Lovable untuk notifikasi approval + subscription billing
