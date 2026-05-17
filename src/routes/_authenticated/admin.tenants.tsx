import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { setTenantStatus } from "@/lib/tenant.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/tenants")({
  component: TenantsPage,
  head: () => ({ meta: [{ title: "Daftar BUMDes — Admin" }] }),
});

interface Tenant {
  id: string;
  nama_bumdes: string;
  kode_bumdes: string;
  nama_desa: string;
  nama_kecamatan: string;
  email: string | null;
  status: "pending" | "active" | "suspended";
  created_at: string;
}

function TenantsPage() {
  const [items, setItems] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const statusFn = useServerFn(setTenantStatus);

  async function load() {
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as Tenant[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggle(t: Tenant) {
    const newStatus = t.status === "active" ? "suspended" : "active";
    try {
      await statusFn({ data: { tenant_id: t.id, status: newStatus } });
      toast.success(`Tenant ${newStatus === "active" ? "diaktifkan" : "disuspend"}`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Daftar BUMDes</h1>
      <p className="mt-1 text-sm text-muted-foreground">Semua tenant yang aktif di platform.</p>

      <div className="mt-6 overflow-hidden rounded-lg border bg-card">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Memuat...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Belum ada BUMDes terdaftar.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Kode</th>
                <th className="p-3">Nama BUMDes</th>
                <th className="p-3">Lokasi</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="p-3 font-mono text-xs">{t.kode_bumdes}</td>
                  <td className="p-3 font-medium">{t.nama_bumdes}</td>
                  <td className="p-3 text-muted-foreground">{t.nama_desa}, {t.nama_kecamatan}</td>
                  <td className="p-3">
                    <Badge variant={t.status === "active" ? "default" : t.status === "suspended" ? "destructive" : "secondary"}>
                      {t.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => toggle(t)}>
                      {t.status === "active" ? "Suspend" : "Aktifkan"}
                    </Button>
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
