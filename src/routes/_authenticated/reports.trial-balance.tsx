import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/reports/trial-balance")({
  component: TrialBalancePage,
  head: () => ({ meta: [{ title: "Neraca Saldo" }] }),
});

interface Row {
  kode: string; nama: string; tipe: string; normal_balance: "D" | "K";
  debit: number; kredit: number; saldo: number;
}

function TrialBalancePage() {
  const { primaryTenantId } = useAuth();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!primaryTenantId) return;
    setLoading(true);
    // Aggregate journal_items for posted journals up to selected period
    const lastDay = new Date(year, month, 0).toISOString().slice(0, 10);
    const { data: jis, error } = await supabase
      .from("journal_items")
      .select(`debit,kredit, account:chart_of_accounts!inner(id,kode,nama,tipe,normal_balance,is_postable,tenant_id), journal:journals!inner(status,tanggal,tenant_id)`)
      .eq("journal.tenant_id", primaryTenantId)
      .eq("journal.status", "posted")
      .lte("journal.tanggal", lastDay);
    if (error) { setLoading(false); return; }

    const map = new Map<string, Row>();
    (jis as any[] ?? []).forEach((it) => {
      const a = it.account;
      const k = a.id;
      const cur = map.get(k) ?? { kode: a.kode, nama: a.nama, tipe: a.tipe, normal_balance: a.normal_balance, debit: 0, kredit: 0, saldo: 0 };
      cur.debit += Number(it.debit);
      cur.kredit += Number(it.kredit);
      map.set(k, cur);
    });
    const result = Array.from(map.values()).map((r) => ({
      ...r,
      saldo: r.normal_balance === "D" ? r.debit - r.kredit : r.kredit - r.debit,
    })).sort((a, b) => a.kode.localeCompare(b.kode));
    setRows(result);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [primaryTenantId, year, month]);

  const totalD = rows.reduce((s, r) => s + r.debit, 0);
  const totalK = rows.reduce((s, r) => s + r.kredit, 0);

  if (!primaryTenantId) return <div className="p-8 text-muted-foreground">Anda belum terhubung ke BUMDes.</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Neraca Saldo</h1>
      <p className="text-sm text-muted-foreground">Saldo seluruh akun dari jurnal posted s/d akhir periode.</p>

      <div className="mt-4 flex gap-2 items-end">
        <div>
          <label className="text-xs text-muted-foreground">Tahun</label>
          <input type="number" className="block rounded border bg-background p-1 text-sm" value={year} onChange={(e) => setYear(parseInt(e.target.value))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Bulan</label>
          <select className="block rounded border bg-background p-1 text-sm" value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <Button size="sm" variant="outline" onClick={load}>Refresh</Button>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border bg-card">
        {loading ? <div className="p-8 text-center text-muted-foreground">Memuat...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Kode</th>
                <th className="p-3 text-left">Akun</th>
                <th className="p-3 text-right">Debit</th>
                <th className="p-3 text-right">Kredit</th>
                <th className="p-3 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Belum ada jurnal posted.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.kode} className="border-t">
                  <td className="p-3 font-mono text-xs">{r.kode}</td>
                  <td className="p-3">{r.nama}</td>
                  <td className="p-3 text-right">{r.debit.toLocaleString("id-ID")}</td>
                  <td className="p-3 text-right">{r.kredit.toLocaleString("id-ID")}</td>
                  <td className="p-3 text-right font-medium">{r.saldo.toLocaleString("id-ID")}</td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot className="bg-muted/30 font-semibold">
                <tr><td colSpan={2} className="p-3 text-right">Total</td>
                  <td className="p-3 text-right">{totalD.toLocaleString("id-ID")}</td>
                  <td className="p-3 text-right">{totalK.toLocaleString("id-ID")}</td>
                  <td className="p-3 text-right">{totalD === totalK ? "✓" : "✗"}</td></tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  );
}
