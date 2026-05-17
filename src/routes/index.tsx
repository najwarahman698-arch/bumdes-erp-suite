import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Layers, ShieldCheck, Wallet } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "ERP BUMDes — Platform Multi-Tenant Akuntansi BUMDes" },
      { name: "description", content: "SaaS ERP untuk BUMDes: pendaftaran online, accounting engine otomatis, multi unit usaha, laporan realtime." },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-semibold">ERP BUMDes</span>
          </div>
          <nav className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Masuk
            </Link>
            <Link
              to="/daftar"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Daftar BUMDes
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Platform ERP Multi-Tenant<br />untuk BUMDes Modern
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Kelola seluruh unit usaha BUMDes Anda dalam satu sistem terpadu.
            Accounting engine otomatis, laporan realtime, dan isolasi data per BUMDes.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/daftar" className="inline-flex items-center rounded-md bg-primary px-6 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90">
              Daftar BUMDes Anda
            </Link>
            <Link to="/login" className="inline-flex items-center rounded-md border border-input bg-background px-6 py-3 text-base font-medium hover:bg-accent">
              Sudah punya akun
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Layers, title: "Multi Unit Usaha", desc: "Satu BUMDes, banyak unit: wisata, simpan pinjam, air bersih, dagang, dan lainnya." },
              { icon: Wallet, title: "Auto Journal", desc: "Setiap transaksi membuat jurnal otomatis. User tidak perlu input debit/kredit." },
              { icon: ShieldCheck, title: "Isolasi Tenant", desc: "Data setiap BUMDes terisolasi penuh dengan keamanan tingkat baris (RLS)." },
              { icon: Building2, title: "Approval Platform", desc: "Pendaftaran BUMDes ditinjau super admin platform sebelum aktif." },
            ].map((f) => (
              <div key={f.title} className="rounded-lg border bg-card p-6">
                <f.icon className="h-8 w-8 text-primary" />
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} ERP BUMDes Platform
        </div>
      </footer>
    </div>
  );
}
