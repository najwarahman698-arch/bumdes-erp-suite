import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Masuk — ERP BUMDes" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Berhasil masuk");
    navigate({ to: "/dashboard" });
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Akun dibuat. Silakan masuk.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Beranda</Link>
        <div className="mt-4 rounded-lg border bg-card p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Akses Platform</h1>
          <p className="mt-1 text-sm text-muted-foreground">Masuk dengan email akses Anda</p>

          <Tabs defaultValue="login" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Masuk</TabsTrigger>
              <TabsTrigger value="signup">Daftar Akun</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <Inputs email={email} setEmail={setEmail} password={password} setPassword={setPassword} />
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Memproses..." : "Masuk"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <Inputs email={email} setEmail={setEmail} password={password} setPassword={setPassword} />
                <p className="text-xs text-muted-foreground">
                  Untuk pendaftaran BUMDes baru, gunakan halaman <Link to="/daftar" className="underline">Daftar BUMDes</Link>.
                </p>
                <Button type="submit" disabled={loading} className="w-full" variant="secondary">
                  {loading ? "Memproses..." : "Buat Akun"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function Inputs({ email, setEmail, password, setPassword }: any) {
  return (
    <>
      <div className="space-y-1.5">
        <Label>Email</Label>
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Password</Label>
        <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
    </>
  );
}
