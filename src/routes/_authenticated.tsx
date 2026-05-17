import { createFileRoute, Outlet, Link, useNavigate, redirect } from "@tanstack/react-router";
import { Building2, LayoutDashboard, LogOut, Users, FileText, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/login" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, isSuperAdmin, isTenantAdmin, signOut, loading } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login" });
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Memuat...</div>;
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="w-64 border-r bg-card">
        <div className="flex items-center gap-2 border-b p-4">
          <Building2 className="h-5 w-5 text-primary" />
          <span className="font-semibold">ERP BUMDes</span>
        </div>
        <nav className="space-y-1 p-3">
          <NavItem to="/dashboard" icon={LayoutDashboard}>Dashboard</NavItem>

          {isSuperAdmin && (
            <>
              <SectionLabel>Super Admin</SectionLabel>
              <NavItem to="/admin/registrations" icon={FileText}>Pendaftaran</NavItem>
              <NavItem to="/admin/tenants" icon={Building2}>Daftar BUMDes</NavItem>
            </>
          )}

          {isTenantAdmin && (
            <>
              <SectionLabel>BUMDes</SectionLabel>
              <NavItem to="/units" icon={Layers}>Unit Usaha</NavItem>
            </>
          )}
        </nav>

        <div className="absolute bottom-0 w-64 border-t bg-card p-3">
          <div className="mb-2 px-2 text-xs text-muted-foreground truncate">{user?.email}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Keluar
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ to, icon: Icon, children }: { to: string; icon: any; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
      activeProps={{ className: "bg-accent text-foreground font-medium" }}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 px-3 pb-1 text-xs font-semibold uppercase text-muted-foreground">{children}</div>;
}
