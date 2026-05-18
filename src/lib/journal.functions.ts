import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const itemSchema = z.object({
  account_id: z.string().uuid(),
  debit: z.number().nonnegative().default(0),
  kredit: z.number().nonnegative().default(0),
  deskripsi: z.string().max(255).optional(),
});

export const createJournal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        tenant_id: z.string().uuid(),
        unit_id: z.string().uuid().nullable().optional(),
        tanggal: z.string(),
        deskripsi: z.string().max(500).optional(),
        items: z.array(itemSchema).min(2),
        post_now: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // generate nomor: JV-YYYYMM-NNNN
    const now = new Date(data.tanggal);
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const { count } = await supabase
      .from("journals")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", data.tenant_id);
    const nomor = `JV-${ym}-${String((count ?? 0) + 1).padStart(4, "0")}`;

    const { data: jr, error: jErr } = await supabase
      .from("journals")
      .insert({
        tenant_id: data.tenant_id,
        unit_id: data.unit_id ?? null,
        nomor,
        tanggal: data.tanggal,
        deskripsi: data.deskripsi,
        status: "draft",
        created_by: userId,
      })
      .select("id")
      .single();
    if (jErr) throw new Error(jErr.message);

    const items = data.items.map((it, i) => ({
      journal_id: jr.id,
      account_id: it.account_id,
      debit: it.debit,
      kredit: it.kredit,
      deskripsi: it.deskripsi,
      sort_order: i,
    }));
    const { error: iErr } = await supabase.from("journal_items").insert(items);
    if (iErr) {
      await supabase.from("journals").delete().eq("id", jr.id);
      throw new Error(iErr.message);
    }

    if (data.post_now) {
      const { error: pErr } = await supabase
        .from("journals")
        .update({ status: "posted" })
        .eq("id", jr.id);
      if (pErr) throw new Error(pErr.message);
    }
    return { ok: true, id: jr.id, nomor };
  });

export const setJournalStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["posted", "void"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("journals")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
