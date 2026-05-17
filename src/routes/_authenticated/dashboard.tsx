import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — ERP BUMDes" }] }),
});

function Dashboard() {
  const { user, isSuperAdmin, isTenantAdmin, roles } = useAuth();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Selamat datang</h1>
      <p className="mt-1 text-muted-foreground">{user?.email}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isSuperAdmin && (
          <Card title="Super Admin Platform" desc="Anda dapat mengelola seluruh tenant BUMDes di platform.">
            <Link to="/admin/registrations" className="text-sm font-medium text-primary underline">
              Tinjau Pendaftaran →
            </Link>
          </Card>
        )}

        {isTenantAdmin && (
          <Card title="Admin BUMDes" desc="Kelola unit usaha dan operasional BUMDes Anda.">
            <Link to="/units" className="text-sm font-medium text-primary underline">
              Buka Unit Usaha →
            </Link>
          </Card>
        )}

        {!isSuperAdmin && !isTenantAdmin && (
          <Card title="Belum ada role" desc="Akun Anda belum memiliki peran. Hubungi admin BUMDes Anda.">
            <span className="text-xs text-muted-foreground">Role: {roles.length}</span>
          </Card>
        )}
      </div>

      <div className="mt-10 rounded-lg border bg-card p-6">
        <h2 className="font-semibold">Modul Akuntansi (Fase Berikutnya)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Chart of Accounts, Journal Engine, Auto Journal, Inventory, Fixed Asset, dan Laporan
          (Neraca, Laba Rugi, Buku Besar, Trial Balance) akan dibangun di atas fondasi
          multi-tenant ini.
        </p>
      </div>
    </div>
  );
}

function Card({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}
