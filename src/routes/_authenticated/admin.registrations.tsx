import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { approveRegistration, rejectRegistration } from "@/lib/tenant.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/registrations")({
  component: RegistrationsPage,
  head: () => ({ meta: [{ title: "Pendaftaran BUMDes — Admin" }] }),
});

interface Registration {
  id: string;
  nama_bumdes: string;
  nama_desa: string;
  nama_kecamatan: string;
  nama_pemohon: string;
  email_akses: string;
  nomor_whatsapp: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  rejection_reason: string | null;
}

function RegistrationsPage() {
  const [items, setItems] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejecting, setRejecting] = useState<Registration | null>(null);
  const [reason, setReason] = useState("");
  const [accessInfo, setAccessInfo] = useState<any>(null);

  const approveFn = useServerFn(approveRegistration);
  const rejectFn = useServerFn(rejectRegistration);

  async function load() {
    const { data, error } = await supabase
      .from("tenant_registrations")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as Registration[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("registrations")
      .on("postgres_changes", { event: "*", schema: "public", table: "tenant_registrations" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function handleApprove(id: string) {
    if (!confirm("Setujui pendaftaran ini? Akun direktur BUMDes akan dibuat otomatis.")) return;
    try {
      const res: any = await approveFn({ data: { registration_id: id } });
      setAccessInfo(res.access);
      toast.success("Pendaftaran disetujui");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleReject() {
    if (!rejecting) return;
    try {
      await rejectFn({ data: { registration_id: rejecting.id, reason } });
      toast.success("Pendaftaran ditolak");
      setRejecting(null);
      setReason("");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Pendaftaran BUMDes</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tinjau dan setujui permintaan pendaftaran BUMDes. Update realtime tanpa refresh.
      </p>

      <div className="mt-6 overflow-hidden rounded-lg border bg-card">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Memuat...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Belum ada pendaftaran.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">BUMDes</th>
                <th className="p-3">Pemohon</th>
                <th className="p-3">Email Akses</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3">
                    <div className="font-medium">{r.nama_bumdes}</div>
                    <div className="text-xs text-muted-foreground">{r.nama_desa}, {r.nama_kecamatan}</div>
                  </td>
                  <td className="p-3">
                    <div>{r.nama_pemohon}</div>
                    <div className="text-xs text-muted-foreground">{r.nomor_whatsapp}</div>
                  </td>
                  <td className="p-3 font-mono text-xs">{r.email_akses}</td>
                  <td className="p-3">
                    <StatusBadge status={r.status} />
                    {r.rejection_reason && <div className="mt-1 text-xs text-muted-foreground">{r.rejection_reason}</div>}
                  </td>
                  <td className="p-3 text-right">
                    {r.status === "pending" ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={() => handleApprove(r.id)}>
                          <Check className="mr-1 h-3 w-3" /> Setujui
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setRejecting(r)}>
                          <X className="mr-1 h-3 w-3" /> Tolak
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Selesai</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Reject dialog */}
      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Pendaftaran</DialogTitle>
            <DialogDescription>{rejecting?.nama_bumdes}</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Alasan penolakan"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!reason.trim()}>
              Tolak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Access info dialog */}
      <Dialog open={!!accessInfo} onOpenChange={(o) => !o && setAccessInfo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pendaftaran Disetujui</DialogTitle>
            <DialogDescription>
              Salin dan kirim kredensial berikut ke pemohon via WhatsApp/email.
            </DialogDescription>
          </DialogHeader>
          {accessInfo && (
            <div className="space-y-3">
              <CopyRow label="Email" value={accessInfo.email} />
              {accessInfo.temp_password && <CopyRow label="Password Sementara" value={accessInfo.temp_password} />}
              <CopyRow label="Link Login" value={window.location.origin + accessInfo.login_url} />
              <p className="text-xs text-muted-foreground">{accessInfo.note}</p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setAccessInfo(null)}>Selesai</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <code className="break-all text-sm">{value}</code>
        <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(value); toast.success("Disalin"); }}>
          <Copy className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "approved" ? "default" : status === "rejected" ? "destructive" : "secondary";
  const label = status === "approved" ? "Disetujui" : status === "rejected" ? "Ditolak" : "Menunggu";
  return <Badge variant={variant as any}>{label}</Badge>;
}
