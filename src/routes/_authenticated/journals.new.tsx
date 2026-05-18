import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { createJournal } from "@/lib/journal.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/journals/new")({
  component: NewJournalPage,
  head: () => ({ meta: [{ title: "Buat Jurnal" }] }),
});

interface Account { id: string; kode: string; nama: string; is_postable: boolean; is_active: boolean }
interface Row { account_id: string; debit: string; kredit: string; deskripsi: string }

function NewJournalPage() {
  const { primaryTenantId } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [deskripsi, setDeskripsi] = useState("");
  const [rows, setRows] = useState<Row[]>([
    { account_id: "", debit: "", kredit: "", deskripsi: "" },
    { account_id: "", debit: "", kredit: "", deskripsi: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const createFn = useServerFn(createJournal);

  useEffect(() => {
    if (!primaryTenantId) return;
    supabase.from("chart_of_accounts")
      .select("id,kode,nama,is_postable,is_active")
      .eq("tenant_id", primaryTenantId).eq("is_active", true).eq("is_postable", true)
      .order("kode")
      .then(({ data }) => setAccounts((data as Account[]) ?? []));
  }, [primaryTenantId]);

  const totalD = rows.reduce((s, r) => s + (parseFloat(r.debit) || 0), 0);
  const totalK = rows.reduce((s, r) => s + (parseFloat(r.kredit) || 0), 0);
  const balanced = totalD === totalK && totalD > 0;

  function update(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function add() { setRows([...rows, { account_id: "", debit: "", kredit: "", deskripsi: "" }]); }
  function remove(i: number) { if (rows.length > 2) setRows(rows.filter((_, idx) => idx !== i)); }

  async function submit(post: boolean) {
    if (!primaryTenantId) return;
    if (!balanced) { toast.error("Debit ≠ Kredit"); return; }
    if (rows.some((r) => !r.account_id)) { toast.error("Pilih semua akun"); return; }
    setSaving(true);
    try {
      await createFn({ data: {
        tenant_id: primaryTenantId,
        tanggal, deskripsi,
        items: rows.map((r) => ({
          account_id: r.account_id,
          debit: parseFloat(r.debit) || 0,
          kredit: parseFloat(r.kredit) || 0,
          deskripsi: r.deskripsi || undefined,
        })),
        post_now: post,
      }});
      toast.success(post ? "Jurnal dibuat & diposting" : "Jurnal disimpan sebagai draft");
      navigate({ to: "/journals" });
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  }

  if (!primaryTenantId) return <div className="p-8 text-muted-foreground">Anda belum terhubung ke BUMDes.</div>;

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold">Buat Jurnal</h1>
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div>
          <Label>Tanggal</Label>
          <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        </div>
        <div className="col-span-2">
          <Label>Deskripsi</Label>
          <Input value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} placeholder="Keterangan jurnal" />
        </div>
      </div>

      <div className="mt-6 rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-2 text-left">Akun</th>
              <th className="p-2 text-right w-32">Debit</th>
              <th className="p-2 text-right w-32">Kredit</th>
              <th className="p-2 text-left">Keterangan</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="p-2">
                  <select className="w-full rounded border bg-background p-1 text-sm" value={r.account_id} onChange={(e) => update(i, { account_id: e.target.value })}>
                    <option value="">— pilih akun —</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.kode} — {a.nama}</option>)}
                  </select>
                </td>
                <td className="p-2"><Input type="number" step="0.01" className="text-right" value={r.debit} onChange={(e) => update(i, { debit: e.target.value, kredit: e.target.value ? "" : r.kredit })} /></td>
                <td className="p-2"><Input type="number" step="0.01" className="text-right" value={r.kredit} onChange={(e) => update(i, { kredit: e.target.value, debit: e.target.value ? "" : r.debit })} /></td>
                <td className="p-2"><Input value={r.deskripsi} onChange={(e) => update(i, { deskripsi: e.target.value })} /></td>
                <td className="p-2"><Button size="sm" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-3 w-3" /></Button></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/30 font-medium">
              <td className="p-2 text-right">Total</td>
              <td className="p-2 text-right">{totalD.toLocaleString("id-ID")}</td>
              <td className="p-2 text-right">{totalK.toLocaleString("id-ID")}</td>
              <td colSpan={2} className={`p-2 ${balanced ? "text-green-600" : "text-red-600"}`}>
                {balanced ? "✓ Balanced" : `Selisih: ${(totalD - totalK).toLocaleString("id-ID")}`}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 flex justify-between">
        <Button variant="outline" size="sm" onClick={add}><Plus className="mr-1 h-3 w-3" /> Tambah Baris</Button>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => submit(false)} disabled={saving || !balanced}>Simpan Draft</Button>
          <Button onClick={() => submit(true)} disabled={saving || !balanced}>Simpan & Post</Button>
        </div>
      </div>
    </div>
  );
}
