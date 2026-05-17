import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface UserRole {
  role:
    | "super_admin_platform"
    | "direktur_bumdes"
    | "admin_bumdes"
    | "manager_unit"
    | "operator_unit"
    | "kasir";
  tenant_id: string | null;
  unit_id: string | null;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // defer to avoid deadlock
        setTimeout(() => loadRoles(sess.user.id), 0);
      } else {
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) loadRoles(sess.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadRoles(uid: string) {
    const { data } = await supabase
      .from("user_roles")
      .select("role, tenant_id, unit_id")
      .eq("user_id", uid);
    setRoles((data as UserRole[]) ?? []);
  }

  const isSuperAdmin = roles.some((r) => r.role === "super_admin_platform");
  const tenantRoles = roles.filter((r) => r.tenant_id);
  const primaryTenantId = tenantRoles[0]?.tenant_id ?? null;
  const isTenantAdmin = roles.some(
    (r) => r.role === "direktur_bumdes" || r.role === "admin_bumdes",
  );

  async function signOut() {
    await supabase.auth.signOut();
  }

  return {
    session,
    user,
    roles,
    isSuperAdmin,
    isTenantAdmin,
    primaryTenantId,
    loading,
    signOut,
  };
}
