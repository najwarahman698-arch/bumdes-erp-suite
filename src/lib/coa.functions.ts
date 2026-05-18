import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        tenant_id: z.string().uuid(),
        unit_id: z.string().uuid().nullable().optional(),
        parent_id: z.string().uuid().nullable().optional(),
        nama: z.string().min(1).max(150),
        tipe: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
        normal_balance: z.enum(["D", "K"]),
        is_header: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // generate kode
    const { data: kode, error: kodeErr } = await supabase.rpc(
      "generate_next_account_code",
      { _tenant_id: data.tenant_id, _parent_id: data.parent_id ?? null },
    );
    if (kodeErr) throw new Error(kodeErr.message);

    // determine level
    let level = 1;
    if (data.parent_id) {
      const { data: parent } = await supabase
        .from("chart_of_accounts")
        .select("level")
        .eq("id", data.parent_id)
        .maybeSingle();
      level = (parent?.level ?? 1) + 1;
    }

    const { error } = await supabase.from("chart_of_accounts").insert({
      tenant_id: data.tenant_id,
      unit_id: data.unit_id ?? null,
      parent_id: data.parent_id ?? null,
      kode: kode as string,
      nama: data.nama,
      tipe: data.tipe,
      normal_balance: data.normal_balance,
      level,
      is_header: data.is_header,
      is_postable: !data.is_header,
    });
    if (error) throw new Error(error.message);
    return { ok: true, kode };
  });

export const toggleAccountActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("chart_of_accounts")
      .update({ is_active: data.is_active, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
