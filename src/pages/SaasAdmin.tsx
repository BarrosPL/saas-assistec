import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Building2,
  Users,
  DollarSign,
  ShieldCheck,
  LogOut,
  Plus,
  Ban,
  CheckCircle2,
  Loader2,
  LayoutDashboard,
  TrendingUp,
  ShoppingCart,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Tab = "overview" | "tenants" | "create" | "financeiro";

export default function SaasAdmin() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [confirmBan, setConfirmBan] = useState<{ userId: string; name: string; isBanned: boolean } | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formConfirmPassword, setFormConfirmPassword] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  // Metrics query
  const { data: metrics } = useQuery({
    queryKey: ["saas-metrics"],
    queryFn: async () => {
      const [profiles, orders, sales] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).or("is_super_admin.is.null,is_super_admin.eq.false"),
        supabase.from("service_orders").select("id", { count: "exact", head: true }),
        supabase.from("sales").select("total").neq("total", 0),
      ]);
      const totalRevenue = (sales.data || []).reduce((sum, s) => sum + Number(s.total || 0), 0);
      return {
        totalUsers: profiles.count || 0,
        totalOrders: orders.count || 0,
        totalSales: sales.data?.length || 0,
        totalRevenue,
      };
    },
  });

  // Tenants: todos os profiles que NÃO são super admin
  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ["saas-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .or("is_super_admin.is.null,is_super_admin.eq.false")
        .order("created_at", { ascending: false });
      if (error) console.error("Tenants query error:", error);
      return data || [];
    },
  });

  // Financial query (transactions across all users)
  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ["saas-financial"],
    queryFn: async () => {
      const { data } = await supabase
        .from("financial_transactions")
        .select("amount, transaction_type, transaction_date, description, category")
        .order("transaction_date", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  // Create tenant mutation - salva sessão do admin antes e restaura depois
  const createTenant = async () => {
    if (!formName || !formEmail || !formPassword || !formCompany) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (formPassword !== formConfirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (formPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    setIsCreating(true);
    try {
      // 1. Invoca a função RPC para criar o usuário e os perfis no backend 
      //    bypassando as regras de auth do cliente e NÃO afetando a sessão local
      const { data, error } = await supabase.rpc("create_tenant_admin", {
        admin_email: formEmail,
        admin_password: formPassword,
        admin_name: formName,
        admin_company: formCompany
      });

      if (error) {
        throw new Error(error.message);
      }

      toast.success("Conta criada com sucesso!", {
        description: `Lojista ${formName} (${formCompany}) cadastrado.`,
      });
      setFormName(""); setFormEmail(""); setFormPassword(""); setFormCompany(""); setFormConfirmPassword("");
      queryClient.invalidateQueries({ queryKey: ["saas-tenants"] });
      queryClient.invalidateQueries({ queryKey: ["saas-metrics"] });
      setActiveTab("tenants");
    } catch (err: any) {
      toast.error("Erro ao criar conta", { description: err.message });
    } finally {
      setIsCreating(false);
    }
  };

  // Toggle ban mutation - Update direto no banco em vez de usar edge function
  const toggleBan = async (userId: string, isBanned: boolean) => {
    try {
      // Usar a edge function seria o ideal, mas como o RLS não permite gerenciar Auth Users 
      // diretamente a partir do client sem service_role, precisamos atualizar a flag no profile
      // que depois pode ser checada pelo app principal para bloquear o acesso.
      const { error } = await supabase
        .from("profiles")
        .update({ is_banned: isBanned })
        .eq("user_id", userId);

      if (error) throw error;
      
      toast.success(isBanned ? "Conta bloqueada com sucesso" : "Conta reativada com sucesso", {
        description: "O usuário não poderá mais acessar o sistema.",
      });
      queryClient.invalidateQueries({ queryKey: ["saas-tenants"] });
    } catch (err: any) {
      toast.error("Erro ao alterar status", { description: err.message });
      console.error(err);
    } finally {
      setConfirmBan(null);
    }
  };

  const navItems: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "overview", label: "Visão Geral", icon: LayoutDashboard },
    { id: "tenants", label: "Lojistas", icon: Building2 },
    { id: "create", label: "Nova Conta", icon: Plus },
    { id: "financeiro", label: "Financeiro", icon: DollarSign },
  ];

  const totalIncome = (transactions || [])
    .filter((t) => t.transaction_type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = (transactions || [])
    .filter((t) => t.transaction_type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-border bg-sidebar flex flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-4 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <ShieldCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold text-sidebar-foreground">Painel SaaS</p>
            <p className="text-xs text-sidebar-foreground/60">Administração</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {profile?.full_name?.charAt(0).toUpperCase() || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{profile?.full_name || "Admin"}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">{profile?.email}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-sidebar-foreground/50" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 space-y-6">

          {/* ====== OVERVIEW ====== */}
          {activeTab === "overview" && (
            <>
              <div>
                <h1 className="text-2xl font-bold">Visão Geral do Sistema</h1>
                <p className="text-muted-foreground">Métricas globais de toda a plataforma.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Lojistas Ativos</CardTitle>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics?.totalUsers ?? "—"}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ordens de Serviço</CardTitle>
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics?.totalOrders ?? "—"}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Vendas Realizadas</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics?.totalSales ?? "—"}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Volume Financeiro</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {metrics ? `R$ ${metrics.totalRevenue.toLocaleString("pt-BR")}` : "—"}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Últimas Transações do Sistema</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(transactions || []).slice(0, 8).map((t, i) => (
                          <TableRow key={i}>
                            <TableCell>{t.description}</TableCell>
                            <TableCell>{t.category}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={t.transaction_type === "income" ? "text-emerald-500" : "text-red-500"}>
                                {t.transaction_type === "income" ? "Receita" : "Despesa"}
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-right font-medium ${t.transaction_type === "income" ? "text-emerald-500" : "text-red-500"}`}>
                              {t.transaction_type === "income" ? "+" : "-"}R$ {Number(t.amount).toLocaleString("pt-BR")}
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!transactions || transactions.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma transação encontrada.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* ====== TENANTS ====== */}
          {activeTab === "tenants" && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Lojistas</h1>
                  <p className="text-muted-foreground">Gerencie as contas de seus clientes.</p>
                </div>
                <Button onClick={() => setActiveTab("create")}>
                  <Plus className="h-4 w-4 mr-2" /> Nova Conta
                </Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Cadastro</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenantsLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : tenants?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Nenhum lojista cadastrado. <button className="text-primary hover:underline" onClick={() => setActiveTab("create")}>Criar agora</button>
                          </TableCell>
                        </TableRow>
                      ) : (
                        tenants?.map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="font-medium">{t.full_name}</TableCell>
                            <TableCell>{t.email}</TableCell>
                            <TableCell>{format(new Date(t.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                            <TableCell>
                              {t.is_banned ? (
                                <Badge variant="outline" className="bg-red-500/10 text-red-500">Bloqueado</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500">Ativo</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className={t.is_banned ? "text-emerald-500 hover:text-emerald-600" : "text-destructive hover:text-destructive"}
                                onClick={() => setConfirmBan({ userId: t.user_id, name: t.full_name, isBanned: !t.is_banned })}
                              >
                                {t.is_banned ? (
                                  <><CheckCircle2 className="h-3 w-3 mr-1" /> Reativar</>
                                ) : (
                                  <><Ban className="h-3 w-3 mr-1" /> Bloquear</>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {/* ====== CRIAR CONTA ====== */}
          {activeTab === "create" && (
            <div className="flex flex-1 items-center justify-center min-h-[calc(100vh-8rem)]">
              <div className="w-full max-w-md">
                <div className="flex flex-col items-center mb-8">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary mb-3">
                    <Plus className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <h1 className="text-2xl font-bold">Nova Conta de Lojista</h1>
                  <p className="text-muted-foreground text-sm">Preencha os dados para criar o acesso</p>
                </div>

                <Card className="border-border/50 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-xl">Criar nova conta</CardTitle>
                    <CardDescription>Preencha os dados do novo assinante</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="form-name">Nome completo</Label>
                      <Input
                        id="form-name"
                        type="text"
                        placeholder="Nome do responsável"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        disabled={isCreating}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="form-company">Nome da empresa</Label>
                      <Input
                        id="form-company"
                        type="text"
                        placeholder="Ex: Easy Assist - Assistências Tecnicas"
                        value={formCompany}
                        onChange={(e) => setFormCompany(e.target.value)}
                        disabled={isCreating}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="form-email">E-mail</Label>
                      <Input
                        id="form-email"
                        type="email"
                        placeholder="email@empresa.com"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        disabled={isCreating}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="form-password">Senha</Label>
                      <Input
                        id="form-password"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        disabled={isCreating}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="form-confirm-password">Confirmar senha</Label>
                      <Input
                        id="form-confirm-password"
                        type="password"
                        placeholder="Repita a senha"
                        value={formConfirmPassword}
                        onChange={(e) => setFormConfirmPassword(e.target.value)}
                        disabled={isCreating}
                      />
                    </div>

                    <Button
                      className="w-full"
                      onClick={createTenant}
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando conta...</>
                      ) : (
                        "Criar conta"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ====== FINANCEIRO ====== */}
          {activeTab === "financeiro" && (
            <>
              <div>
                <h1 className="text-2xl font-bold">Financeiro Global</h1>
                <p className="text-muted-foreground">Visão consolidada de todas as transações do sistema.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="border-emerald-500/20 bg-emerald-500/5">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-emerald-600">Total de Receitas</CardTitle>
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-emerald-600">
                      R$ {totalIncome.toLocaleString("pt-BR")}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-red-500/20 bg-red-500/5">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-red-600">Total de Despesas</CardTitle>
                    <DollarSign className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      R$ {totalExpense.toLocaleString("pt-BR")}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Saldo Líquido</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${totalIncome - totalExpense >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      R$ {(totalIncome - totalExpense).toLocaleString("pt-BR")}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Transações</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {txLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                          </TableCell>
                        </TableRow>
                      ) : transactions?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma transação encontrada.</TableCell>
                        </TableRow>
                      ) : (
                        transactions?.map((t, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-muted-foreground">{format(new Date(t.transaction_date), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                            <TableCell>{t.description}</TableCell>
                            <TableCell>{t.category}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={t.transaction_type === "income" ? "text-emerald-500" : "text-red-500"}>
                                {t.transaction_type === "income" ? "Receita" : "Despesa"}
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-right font-medium ${t.transaction_type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                              {t.transaction_type === "income" ? "+" : "-"}R$ {Number(t.amount).toLocaleString("pt-BR")}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>

      {/* Confirm ban/unban dialog */}
      <Dialog open={!!confirmBan} onOpenChange={() => setConfirmBan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmBan?.isBanned ? "Bloquear conta?" : "Reativar conta?"}</DialogTitle>
            <DialogDescription>
              {confirmBan?.isBanned ? (
                <>Isso impedirá que <strong>{confirmBan?.name}</strong> acesse o sistema. Você pode reativar a conta a qualquer momento.</>
              ) : (
                <>O usuário <strong>{confirmBan?.name}</strong> terá o acesso ao sistema restaurado.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmBan(null)}>Cancelar</Button>
            <Button 
              variant={confirmBan?.isBanned ? "destructive" : "default"} 
              onClick={() => confirmBan && toggleBan(confirmBan.userId, confirmBan.isBanned)}
            >
              {confirmBan?.isBanned ? (
                <><Ban className="h-4 w-4 mr-2" /> Bloquear</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-2" /> Reativar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
