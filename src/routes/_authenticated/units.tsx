import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { createBusinessUnit } from "@/lib/tenant.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/units")({
  component: UnitsPage,
  head: () => ({ meta: [{ title: "Unit Usaha — ERP BUMDes" }] }),
});

const JENIS = [
  { v: "wisata", l: "Wisata" },
  { v: "simpan_pinjam", l: "Simpan Pinjam" },
  { v: "air", l: "Air Bersih" },
  { v: "dagang", l: "Dagang / Minimarket" },
  { v: "peternakan", l: "Peternakan" },
  { v: "jasa", l: "Jasa" },
  { v: "lainnya", l: "Lainnya" },
];

function UnitsPage() {
  const { primaryTenantId } = useAuth();
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ kode_unit: "", nama_unit: "", jenis_unit: "lainnya" });
  const createFn = useServerFn(createBusinessUnit);

  async function load() {
    if (!primaryTenantId) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("business_units")
      .select("*")
      .eq("tenant_id", primaryTenantId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setUnits(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [primaryTenantId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!primaryTenantId) return;
    try {
      await createFn({ data: { tenant_id: primaryTenantId, ...form } as any });
      toast.success("Unit usaha ditambahkan");
      setOpen(false);
      setForm({ kode_unit: "", nama_unit: "", jenis_unit: "lainnya" });
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  if (!primaryTenantId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Unit Usaha</h1>
        <p className="mt-2 text-sm text-muted-foreground">Anda belum terdaftar di tenant manapun.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Unit Usaha</h1>
          <p className="mt-1 text-sm text-muted-foreground">Kelola unit usaha BUMDes Anda.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Tambah Unit</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tambah Unit Usaha</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Kode Unit</Label>
                <Input required value={form.kode_unit} onChange={(e) => setForm({ ...form, kode_unit: e.target.value.toUpperCase() })} placeholder="WSTA01" />
              </div>
              <div className="space-y-1.5">
                <Label>Nama Unit</Label>
                <Input required value={form.nama_unit} onChange={(e) => setForm({ ...form, nama_unit: e.target.value })} placeholder="Wisata Curug" />
              </div>
              <div className="space-y-1.5">
                <Label>Jenis Unit</Label>
                <Select value={form.jenis_unit} onValueChange={(v) => setForm({ ...form, jenis_unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {JENIS.map((j) => <SelectItem key={j.v} value={j.v}>{j.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit">Simpan</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? <div className="text-muted-foreground">Memuat...</div> :
          units.length === 0 ? <div className="text-muted-foreground">Belum ada unit usaha.</div> :
            units.map((u) => (
              <div key={u.id} className="rounded-lg border bg-card p-5">
                <div className="text-xs font-mono text-muted-foreground">{u.kode_unit}</div>
                <h3 className="mt-1 font-semibold">{u.nama_unit}</h3>
                <div className="mt-2 text-xs text-muted-foreground capitalize">{u.jenis_unit.replace("_", " ")}</div>
              </div>
            ))}
      </div>
    </div>
  );
}
