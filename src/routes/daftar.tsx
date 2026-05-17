import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { submitRegistration } from "@/lib/tenant.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/daftar")({
  component: DaftarPage,
  head: () => ({
    meta: [
      { title: "Daftar BUMDes — ERP BUMDes" },
      { name: "description", content: "Daftarkan BUMDes Anda ke platform ERP. Ditinjau maksimal 28 jam." },
    ],
  }),
});

function DaftarPage() {
  const submit = useServerFn(submitRegistration);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    email: "",
    nama_desa: "",
    nama_kecamatan: "",
    nama_bumdes: "",
    nama_pemohon: "",
    gender: "",
    agama: "",
    alamat: "",
    nomor_whatsapp: "",
    email_akses: "",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await submit({ data: form });
      setOpen(true);
    } catch (err: any) {
      toast.error(err.message ?? "Gagal mengirim pendaftaran");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 py-12">
      <div className="mx-auto max-w-2xl px-6">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Kembali
        </Link>
        <div className="mt-4 rounded-lg border bg-card p-8">
          <h1 className="text-2xl font-bold">Pendaftaran BUMDes</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Isi data BUMDes dan pemohon. Tim platform akan meninjau dalam ≤28 jam.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field label="Nama BUMDes" required>
              <Input required value={form.nama_bumdes} onChange={(e) => set("nama_bumdes", e.target.value)} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama Desa" required>
                <Input required value={form.nama_desa} onChange={(e) => set("nama_desa", e.target.value)} />
              </Field>
              <Field label="Nama Kecamatan" required>
                <Input required value={form.nama_kecamatan} onChange={(e) => set("nama_kecamatan", e.target.value)} />
              </Field>
            </div>

            <Field label="Email Kontak BUMDes" required>
              <Input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} />
            </Field>

            <Field label="Nama Pemohon" required>
              <Input required value={form.nama_pemohon} onChange={(e) => set("nama_pemohon", e.target.value)} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Jenis Kelamin">
                <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                    <SelectItem value="Perempuan">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Agama">
                <Input value={form.agama} onChange={(e) => set("agama", e.target.value)} />
              </Field>
            </div>

            <Field label="Alamat">
              <Textarea value={form.alamat} onChange={(e) => set("alamat", e.target.value)} />
            </Field>

            <Field label="Nomor WhatsApp">
              <Input value={form.nomor_whatsapp} onChange={(e) => set("nomor_whatsapp", e.target.value)} placeholder="08xxxxxxxxxx" />
            </Field>

            <Field label="Email Akses (untuk login Direktur BUMDes)" required>
              <Input type="email" required value={form.email_akses} onChange={(e) => set("email_akses", e.target.value)} />
            </Field>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Mengirim..." : "Kirim Pendaftaran"}
            </Button>
          </form>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pendaftaran Diterima</DialogTitle>
            <DialogDescription>
              Permintaan Anda sedang ditinjau dan akan diproses maksimal 28 jam.
              Link akses akan dikirim melalui email setelah disetujui.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => navigate({ to: "/" })}>Kembali ke Beranda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && <span className="text-destructive"> *</span>}</Label>
      {children}
    </div>
  );
}
