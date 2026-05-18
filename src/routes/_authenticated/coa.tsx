import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { createAccount, toggleAccountActive } from "@/lib/coa.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, ChevronRight, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/coa")({
  component: CoaPage,
  head: () => ({ meta: [{ title: "Chart of Accounts" }] }),
});

interface Account {
  id: string;
  kode: string;
  nama: string;
  tipe: "asset" | "liability" | "equity" | "revenue" | "expense";
  normal_balance: "D" | "K";
  parent_id: string | null;
  level: number;
  is_header: boolean;
  is_postable: boolean;
  is_active: boolean;
}

function CoaPage() {
  const { primaryTenantId } = useAuth();
  const [items, setItems] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [parent, setParent] = useState<Account | null>(null);
  const [form, setForm] = useState({ nama: "", tipe: "asset", normal_balance: "D", is_header: false });

  const createFn = useServerFn(createAccount);
  const toggleFn = useServerFn(toggleAccountActive);

  async function load() {
    if (!primaryTenantId) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("chart_of_accounts")
      .select("id,kode,nama,tipe,normal_balance,parent_id,level,is_header,is_postable,is_active")
      .eq("tenant_id", primaryTenantId)
      .order("kode");
    if (error) toast.error(error.message);
    setItems((data as Account[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    if (!primaryTenantId) return;
    const ch = supabase.channel("coa")
      .on("postgres_changes", { event: "*", schema: "public", table: "chart_of_accounts" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryTenantId]);

  const tree = useMemo(() => buildTree(items, search), [items, search]);

  function openAdd(p: Account | null) {
    setParent(p);
    setForm({
      nama: "",
      tipe: p?.tipe ?? "asset",
      normal_balance: p?.normal_balance ?? "D",
      is_header: false,
    });
    setOpen(true);
  }

  async function submit() {
    if (!primaryTenantId) return;
    try {
      await createFn({ data: {
        tenant_id: primaryTenantId,
        parent_id: parent?.id ?? null,
        nama: form.nama,
        tipe: form.tipe as any,
        normal_balance: form.normal_balance as any,
        is_header: form.is_header,
      }});
      toast.success("Akun dibuat");
      setOpen(false);
      load();
    } catch (e: any) { toast.error(e.message); }
  }

  if (!primaryTenantId) {
    return <div className="p-8 text-muted-foreground">Anda belum terhubung ke BUMDes.</div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Chart of Accounts</h1>
          <p className="text-sm text-muted-foreground">Struktur akun hierarkis (1.1.01.01). Kode di-generate otomatis.</p>
        </div>
        <Button onClick={() => openAdd(null)}><Plus className="mr-1 h-4 w-4" /> Akun Utama</Button>
      </div>

      <div className="mt-4">
        <Input placeholder="Cari kode atau nama..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      </div>

      <div className="mt-4 rounded-lg border bg-card">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Memuat...</div>
        ) : tree.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Belum ada akun.</div>
        ) : (
          <div className="divide-y">
            {tree.map((n) => (
              <TreeNode key={n.id} node={n} expanded={expanded} setExpanded={setExpanded} onAdd={openAdd} onToggle={async (a) => {
                try { await toggleFn({ data: { id: a.id, is_active: !a.is_active } }); load(); } catch (e: any) { toast.error(e.message); }
              }} />
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Akun{parent ? ` (anak dari ${parent.kode} ${parent.nama})` : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nama Akun</Label>
              <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Contoh: Kas Tunai" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipe</Label>
                <Select value={form.tipe} onValueChange={(v) => setForm({ ...form, tipe: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">Aset</SelectItem>
                    <SelectItem value="liability">Liabilitas</SelectItem>
                    <SelectItem value="equity">Ekuitas</SelectItem>
                    <SelectItem value="revenue">Pendapatan</SelectItem>
                    <SelectItem value="expense">Beban</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Saldo Normal</Label>
                <Select value={form.normal_balance} onValueChange={(v) => setForm({ ...form, normal_balance: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="D">Debit</SelectItem>
                    <SelectItem value="K">Kredit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_header} onCheckedChange={(v) => setForm({ ...form, is_header: v })} />
              <Label>Akun Header (tidak bisa dijurnal)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={submit} disabled={!form.nama.trim()}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TreeNodeData extends Account { children: TreeNodeData[] }

function buildTree(items: Account[], search: string): TreeNodeData[] {
  const map = new Map<string, TreeNodeData>();
  items.forEach((a) => map.set(a.id, { ...a, children: [] }));
  const roots: TreeNodeData[] = [];
  map.forEach((n) => {
    if (n.parent_id && map.has(n.parent_id)) map.get(n.parent_id)!.children.push(n);
    else roots.push(n);
  });
  if (!search.trim()) return roots;
  const q = search.toLowerCase();
  const matches = (n: TreeNodeData): boolean =>
    n.kode.toLowerCase().includes(q) || n.nama.toLowerCase().includes(q) || n.children.some(matches);
  const filter = (nodes: TreeNodeData[]): TreeNodeData[] =>
    nodes.filter(matches).map((n) => ({ ...n, children: filter(n.children) }));
  return filter(roots);
}

function TreeNode({ node, expanded, setExpanded, onAdd, onToggle }: {
  node: TreeNodeData; expanded: Set<string>; setExpanded: (s: Set<string>) => void;
  onAdd: (p: Account) => void; onToggle: (a: Account) => void;
}) {
  const isOpen = expanded.has(node.id) || node.level <= 2;
  const hasChildren = node.children.length > 0;
  const typeColor: Record<string, string> = {
    asset: "text-blue-600", liability: "text-orange-600", equity: "text-purple-600",
    revenue: "text-green-600", expense: "text-red-600",
  };
  return (
    <div>
      <div className="flex items-center gap-2 py-2 pr-3 hover:bg-accent/30" style={{ paddingLeft: `${node.level * 16}px` }}>
        <button
          className="text-muted-foreground"
          onClick={() => {
            const s = new Set(expanded);
            if (s.has(node.id)) s.delete(node.id); else s.add(node.id);
            setExpanded(s);
          }}
        >
          {hasChildren ? (isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : <span className="inline-block w-4" />}
        </button>
        <code className="text-xs font-mono text-muted-foreground w-24">{node.kode}</code>
        <span className={`text-sm ${node.is_header ? "font-semibold" : ""} ${!node.is_active ? "opacity-40 line-through" : ""}`}>{node.nama}</span>
        <span className={`text-xs ${typeColor[node.tipe]}`}>{node.tipe}</span>
        <span className="text-xs text-muted-foreground">({node.normal_balance})</span>
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => onAdd(node)} title="Tambah anak"><Plus className="h-3 w-3" /></Button>
          <Button size="sm" variant="ghost" onClick={() => onToggle(node)} className="text-xs">
            {node.is_active ? "Nonaktifkan" : "Aktifkan"}
          </Button>
        </div>
      </div>
      {isOpen && hasChildren && node.children.map((c) => (
        <TreeNode key={c.id} node={c} expanded={expanded} setExpanded={setExpanded} onAdd={onAdd} onToggle={onToggle} />
      ))}
    </div>
  );
}
