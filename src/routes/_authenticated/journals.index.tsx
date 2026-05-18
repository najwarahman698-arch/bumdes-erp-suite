import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { setJournalStatus } from "@/lib/journal.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/journals/")({
  component: JournalsPage,
  head: () => ({ meta: [{ title: "Jurnal" }] }),
});

interface Journal {
  id: string; nomor: string; tanggal: string; deskripsi: string | null;
  status: "draft" | "posted" | "void"; created_at: string;
}

function JournalsPage() {
  const { primaryTenantId } = useAuth();
  const [items, setItems] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const statusFn = useServerFn(setJournalStatus);

  async function load() {
    if (!primaryTenantId) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("journals")
      .select("id,nomor,tanggal,deskripsi,status,created_at")
      .eq("tenant_id", primaryTenantId)
      .order("tanggal", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as Journal[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    if (!primaryTenantId) return;
    const ch = supabase.channel("journals")
      .on("postgres_changes", { event: "*", schema: "public", table: "journals" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryTenantId]);

  async function changeStatus(id: string, status: "posted" | "void") {
    const msg = status === "posted" ? "Posting jurnal?" : "Void jurnal ini?";
    if (!confirm(msg)) return;
    try {
      await statusFn({ data: { id, status } });
      toast.success("Status diperbarui");
    } catch (e: any) { toast.error(e.message); }
  }

  if (!primaryTenantId) return <div className="p-8 text-muted-foreground">Anda belum terhubung ke BUMDes.</div>;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Jurnal</h1>
          <p className="text-sm text-muted-foreground">Semua jurnal (manual + auto). Hanya jurnal posted yang mempengaruhi laporan.</p>
        </div>
        <Button asChild><Link to="/journals/new"><Plus className="mr-1 h-4 w-4" /> Buat Jurnal</Link></Button>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border bg-card">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Memuat...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Belum ada jurnal.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Nomor</th>
                <th className="p-3">Tanggal</th>
                <th className="p-3">Deskripsi</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((j) => (
                <tr key={j.id} className="border-t">
                  <td className="p-3 font-mono text-xs">{j.nomor}</td>
                  <td className="p-3">{j.tanggal}</td>
                  <td className="p-3">{j.deskripsi}</td>
                  <td className="p-3">
                    <Badge variant={j.status === "posted" ? "default" : j.status === "void" ? "destructive" : "secondary"}>
                      {j.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-right space-x-1">
                    {j.status === "draft" && (
                      <Button size="sm" onClick={() => changeStatus(j.id, "posted")}>Post</Button>
                    )}
                    {j.status === "posted" && (
                      <Button size="sm" variant="outline" onClick={() => changeStatus(j.id, "void")}>Void</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
