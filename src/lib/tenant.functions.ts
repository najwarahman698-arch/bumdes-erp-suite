import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const registrationSchema = z.object({
  email: z.string().email(),
  nama_desa: z.string().min(1).max(100),
  nama_kecamatan: z.string().min(1).max(100),
  nama_bumdes: z.string().min(1).max(150),
  nama_pemohon: z.string().min(1).max(150),
  gender: z.string().max(20).optional(),
  agama: z.string().max(50).optional(),
  alamat: z.string().max(500).optional(),
  nomor_whatsapp: z.string().max(20).optional(),
  email_akses: z.string().email(),
});

export const submitRegistration = createServerFn({ method: "POST" })
  .inputValidator((input) => registrationSchema.parse(input))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("tenant_registrations").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const approveRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ registration_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify super admin
    const { data: roleCheck } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "super_admin_platform")
      .maybeSingle();
    if (!roleCheck) throw new Error("Forbidden: super admin only");

    // Load registration to get email
    const { data: reg, error: regErr } = await supabaseAdmin
      .from("tenant_registrations")
      .select("*")
      .eq("id", data.registration_id)
      .maybeSingle();
    if (regErr || !reg) throw new Error("Registration not found");
    if (reg.status !== "pending") throw new Error("Already processed");

    // Create or find user for director
    let directorUserId: string | null = null;
    const tempPassword =
      "Bumdes" + Math.random().toString(36).slice(2, 10) + "!";

    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: reg.email_akses,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: reg.nama_pemohon },
      });

    if (createErr) {
      // user might already exist — find by listing
      const { data: list } = await supabaseAdmin.auth.admin.listUsers();
      const existing = list?.users.find((u) => u.email === reg.email_akses);
      if (!existing) throw new Error(createErr.message);
      directorUserId = existing.id;
    } else {
      directorUserId = created.user?.id ?? null;
    }

    if (!directorUserId) throw new Error("Failed to provision director user");

    // Call RPC as the authenticated super admin (so auth.uid() inside the RPC works)
    const { data: result, error: rpcErr } = await supabase.rpc(
      "approve_tenant_registration",
      {
        _registration_id: data.registration_id,
        _director_user_id: directorUserId,
      },
    );
    if (rpcErr) throw new Error(rpcErr.message);

    return {
      ok: true,
      tenant: result,
      access: {
        email: reg.email_akses,
        temp_password: createErr ? null : tempPassword,
        login_url: "/login",
        note: createErr
          ? "Akun sudah ada sebelumnya — gunakan password yang sudah dimiliki."
          : "Berikan kredensial ini ke pemohon. Direktur wajib ganti password setelah login.",
      },
    };
  });

export const rejectRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        registration_id: z.string().uuid(),
        reason: z.string().min(1).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.rpc("reject_tenant_registration", {
      _registration_id: data.registration_id,
      _reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setTenantStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        tenant_id: z.string().uuid(),
        status: z.enum(["active", "suspended"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("tenants")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.tenant_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createBusinessUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        tenant_id: z.string().uuid(),
        kode_unit: z.string().min(1).max(20).regex(/^[A-Z0-9_-]+$/i),
        nama_unit: z.string().min(1).max(150),
        jenis_unit: z.enum([
          "wisata",
          "simpan_pinjam",
          "air",
          "dagang",
          "peternakan",
          "jasa",
          "lainnya",
        ]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("business_units").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
