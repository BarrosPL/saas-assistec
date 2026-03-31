import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { format, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { NewTransactionDialog } from "@/components/financial/NewTransactionDialog";

type Tab = "overview" | "tenants" | "create" | "financeiro";

export default function SaasAdmin() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [confirmBan, setConfirmBan] = useState<{ userId: string; name: string; isBanned: boolean } | null>(null);
  const [viewUsage, setViewUsage] = useState<{ userId: string; name: string } | null>(null);
  const [newTxType, setNewTxType] = useState<"income" | "expense" | null>(null);

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
        supabase.from("profiles").select("id", { count: "exact", head: true }), // Carrega TODOS os perfis sem exceção
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
      console.log("[SaasAdmin] Diagnostic: Buscando todos os perfis (incluindo admins)...");
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Tenants query error:", error);
      }
      console.log(`[SaasAdmin] Total de perfis carregados: ${data?.length || 0}`);
      if (data) {
        console.log("[SaasAdmin] IDs dos perfis:", data.map(p => p.user_id));
      }
      return data || [];
    },
  });

  // Dados do Gráfico de Crescimento de Usuários
  const userGrowthData = useMemo(() => {
    if (!tenants) return [];
    
    // Sort tenants ascending by created_at first
    const sortedTenants = [...tenants].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    const grouped = sortedTenants.reduce((acc: Record<string, number>, tenant) => {
      const month = format(new Date(tenant.created_at), "MMM/yyyy", { locale: ptBR });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});

    let total = 0;
    return Object.entries(grouped).map(([month, count]) => {
      total += count;
      return {
        name: month,
        "Novos Lojistas": count,
        "Total Acumulado": total
      };
    });
  }, [tenants]);

  // Usage logs query
  const { data: usageLogs } = useQuery({
    queryKey: ["saas-usage-logs"],
    queryFn: async () => {
      console.log("[SaasAdmin] Buscando logs de uso globais...");
      const { data, error } = await supabase
        .from("user_usage_logs" as any)
        .select("*");
      if (error) {
        console.error("Usage logs query error:", error);
      }
      console.log(`[SaasAdmin] ${data?.length || 0} logs de uso recebidos.`);
      return data || [];
    },
    refetchInterval: 30000, 
  });

  const usageByTenant = useMemo(() => {
    if (!usageLogs || !tenants) return [];
    
    // 1. Primeiro mapeamos os que TEM perfil (Lojistas conhecidos)
    const result = tenants.map(t => {
      const userLogs = usageLogs.filter((l: any) => l.user_id === t.user_id);
      const totalMinutes = userLogs.reduce((sum: number, l: any) => sum + Number(l.duration_minutes || 0), 0);
      
      const hours = Math.floor(totalMinutes / 60);
      const minutes = Math.floor(totalMinutes % 60);
      const formattedTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

      return {
        ...t,
        totalMinutes,
        formattedTime,
        history: userLogs.sort((a: any, b: any) => new Date(a.usage_date).getTime() - new Date(b.usage_date).getTime())
      };
    });

    // 2. Agora procuramos por usuários logs que NÃO estão nos tenants (Perfis não encontrados)
    const knownUserIds = new Set(tenants.map(t => t.user_id));
    const logsFromUnknownUsers = usageLogs.filter((l: any) => !knownUserIds.has(l.user_id));
    
    const unknownGroupedByUserId = logsFromUnknownUsers.reduce((acc: Record<string, any[]>, log: any) => {
      if (!acc[log.user_id]) acc[log.user_id] = [];
      acc[log.user_id].push(log);
      return acc;
    }, {});

    Object.entries(unknownGroupedByUserId).forEach(([userId, logs]: [string, any]) => {
      const totalMinutes = logs.reduce((sum: number, l: any) => sum + Number(l.duration_minutes || 0), 0);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = Math.floor(totalMinutes % 60);
      const formattedTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

      result.push({
        id: `unknown-${userId}`,
        user_id: userId,
        full_name: `User s/ Perfil (${userId.substring(0, 5)})`,
        email: "Não identificado",
        phone: null,
        is_super_admin: false,
        is_banned: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        totalMinutes,
        formattedTime,
        history: logs.sort((a: any, b: any) => new Date(a.usage_date).getTime() - new Date(b.usage_date).getTime())
      } as any);
    });

    return result.sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [usageLogs, tenants]);

  // Dados do Gráfico de Tendência de Uso (Agregado por dia)
  const usageTrendData = useMemo(() => {
    if (!usageLogs) return [];
    
    const grouped = usageLogs.reduce((acc: Record<string, number>, log: any) => {
      // Usar parseISO para evitar que o fuso horário mude a data para o dia anterior
      const date = format(parseISO(log.usage_date), "dd/MM", { locale: ptBR });
      acc[date] = (acc[date] || 0) + Number(log.duration_minutes || 0);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([date, minutes]) => ({ date, minutes }))
      .sort((a, b) => {
        const [dayA, monthA] = a.date.split("/").map(Number);
        const [dayB, monthB] = b.date.split("/").map(Number);
        return monthA !== monthB ? monthA - monthB : dayA - dayB;
      })
      .slice(-15); // Últimos 15 dias
  }, [usageLogs]);

  // Financial query (transactions only for the SaaS Admin)
  const { data: transactions, isLoading: txLoading } = useQuery({
    queryKey: ["saas-financial"],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data } = await supabase
        .from("financial_transactions")
        .select("id, amount, transaction_type, transaction_date, description, category")
        .eq("user_id", profile.id)
        .order("transaction_date", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!profile?.id,
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
      // 1. Salva a sessão atual do admin
      const { data: { session: adminSession } } = await supabase.auth.getSession();

      // 2. Cria o novo usuário via Auth API (isso envia o e-mail de confirmação)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: formEmail,
        password: formPassword,
        options: {
          data: { full_name: formName }
        }
      });

      // 3. Restaura imediatamente a sessão do admin
      if (adminSession) {
        await supabase.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token,
        });
      }

      if (signUpError) {
        throw new Error(signUpError.message);
      }

      // 4. Tenta criar as configurações da empresa para o novo tenant
      //    (pode falhar por RLS, nesse caso será criado no primeiro login do lojista)
      if (signUpData.user) {
        await supabase.from("company_settings").insert({
          user_id: signUpData.user.id,
          company_name: formCompany,
        });
      }

      toast.success("Conta criada com sucesso!", {
        description: `Lojista ${formName} (${formCompany}) cadastrado. Um e-mail de confirmação foi enviado para ${formEmail}.`,
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
                <p className="text-muted-foreground">Métricas globais de toda a plataforma de SaaS.</p>
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
                    <CardTitle className="text-sm font-medium">Faturamento SaaS (Admin)</CardTitle>
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-emerald-600">
                      R$ {totalIncome.toLocaleString("pt-BR")}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Despesas SaaS (Admin)</CardTitle>
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
                    <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${(totalIncome - totalExpense) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      R$ {(totalIncome - totalExpense).toLocaleString("pt-BR")}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Crescimento e Uso</CardTitle>
                      <CardDescription>Evolução da plataforma e engajamento</CardDescription>
                    </div>
                    <Tabs defaultValue="growth" className="w-[200px]">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="growth" className="text-xs">Lojistas</TabsTrigger>
                        <TabsTrigger value="usage" className="text-xs">Tempo de Uso</TabsTrigger>
                      </TabsList>
                      {/* Note: We are using a simplified approach inside cards to keep it clean */}
                    </Tabs>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="growth">
                      <TabsContent value="growth" className="mt-0">
                        <div className="h-80">
                          {userGrowthData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={userGrowthData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                                <Tooltip 
                                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                                />
                                <Legend />
                                <Area type="monotone" name="Total Acumulado" dataKey="Total Acumulado" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorTotal)" />
                                <Area type="monotone" name="Novos Lojistas" dataKey="Novos Lojistas" stroke="hsl(var(--success))" fillOpacity={0} />
                              </AreaChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground">Sem dados suficientes.</div>
                          )}
                        </div>
                      </TabsContent>
                      <TabsContent value="usage" className="mt-0">
                        <div className="h-80">
                          {usageTrendData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={usageTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                                <YAxis name="Minutos" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                                <Tooltip 
                                  contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                                  formatter={(value: number) => [`${value} min`, "Uso Total"]}
                                />
                                <Bar dataKey="minutes" name="Uso Total (minutos)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex h-full items-center justify-center text-muted-foreground">Nenhum dado de uso registrado.</div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Engajamento</CardTitle>
                    <CardDescription>Ranking de tempo de uso</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 max-h-[320px] overflow-y-auto pr-2">
                      {usageByTenant.length > 0 ? (
                        usageByTenant.slice(0, 10).map((tenant, idx) => (
                          <div key={tenant.id} className="flex items-center justify-between group">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                                {idx + 1}º
                              </div>
                              <div className="truncate">
                                <p className="text-sm font-medium leading-none truncate">{tenant.full_name}</p>
                                <p className="text-xs text-muted-foreground mt-1">{tenant.formattedTime} no total</p>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2 text-xs"
                              onClick={() => setViewUsage({ userId: tenant.user_id, name: tenant.full_name })}
                            >
                              Ver mais
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-muted-foreground">Nenhum dado registrado.</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
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
                        <TableHead>Uso Total</TableHead>
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
                              <TableCell className="font-medium">
                                <div>
                                  {t.full_name}
                                  <div className="text-[10px] text-muted-foreground font-mono">UID: {t.user_id}</div>
                                </div>
                              </TableCell>
                              <TableCell>{t.email}</TableCell>
                            <TableCell>{format(new Date(t.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-primary/5">{usageByTenant.find(u => u.id === t.id)?.formattedTime || "0m"}</Badge>
                            </TableCell>
                            <TableCell>
                              {t.is_banned ? (
                                <Badge variant="outline" className="bg-red-500/10 text-red-500">Bloqueado</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500">Ativo</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setViewUsage({ userId: t.user_id, name: t.full_name })}
                              >
                                <Loader2 className="h-3 w-3 mr-1" /> Uso
                              </Button>
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
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Financeiro do SaaS</h1>
                  <p className="text-muted-foreground">Controle exclusivo de receitas (assinaturas) e custos da sua empresa.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="gap-2 text-red-500 border-red-500/20 hover:bg-red-500/10" onClick={() => setNewTxType("expense")}>
                    <TrendingUp className="h-4 w-4 rotate-180" />
                    Nova Despesa
                  </Button>
                  <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setNewTxType("income")}>
                    <TrendingUp className="h-4 w-4" />
                    Nova Receita
                  </Button>
                </div>
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
                  <CardTitle>Histórico de Transações do SaaS</CardTitle>
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
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma transação encontrada no seu financeiro.</TableCell>
                        </TableRow>
                      ) : (
                        transactions?.map((t, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-muted-foreground">{format(parseISO(t.transaction_date), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                            <TableCell>{t.description}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{t.category}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={t.transaction_type === "income" ? "text-emerald-500 bg-emerald-500/10" : "text-red-500 bg-red-500/10"}>
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

      {/* Usage Detail Dialog */}
      <Dialog open={!!viewUsage} onOpenChange={() => setViewUsage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Histórico de Uso: {viewUsage?.name}</DialogTitle>
            <DialogDescription>
              Frequência de acesso e tempo de permanência nos últimos 30 dias.
            </DialogDescription>
          </DialogHeader>
          
          <div className="h-64 mt-4">
            {viewUsage && usageByTenant.find(u => u.user_id === viewUsage.userId)?.history?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usageByTenant.find(u => u.user_id === viewUsage.userId)?.history?.map((h: any) => ({
                  date: format(parseISO(h.usage_date), "dd/MM"),
                  minutes: Number(h.duration_minutes || 0)
                }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                    formatter={(value: number) => [`${value} min`, "Uso"]}
                  />
                  <Area type="monotone" dataKey="minutes" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground border rounded-lg bg-muted/20">
                Nenhum dado de uso detalhado para este lojista ainda.
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="p-3 border rounded-lg bg-card">
              <p className="text-xs text-muted-foreground mb-1">Média Diária</p>
              <p className="text-xl font-bold">
                {viewUsage ? Math.round((usageByTenant.find(u => u.user_id === viewUsage.userId)?.totalMinutes || 0) / Math.max(1, usageByTenant.find(u => u.user_id === viewUsage.userId)?.history?.length || 1)) : 0} min
              </p>
            </div>
            <div className="p-3 border rounded-lg bg-card">
              <p className="text-xs text-muted-foreground mb-1">Total Acumulado</p>
              <p className="text-xl font-bold">
                {viewUsage ? usageByTenant.find(u => u.user_id === viewUsage.userId)?.formattedTime : "0m"}
              </p>
            </div>
            <div className="p-3 border rounded-lg bg-card">
              <p className="text-xs text-muted-foreground mb-1">Dias Ativos</p>
              <p className="text-xl font-bold">
                {viewUsage ? usageByTenant.find(u => u.user_id === viewUsage.userId)?.history?.length : 0}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setViewUsage(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Dialog de Nova Transação do Admin SaaS */}
      {newTxType && (
        <NewTransactionDialog
          type={newTxType}
          open={!!newTxType}
          onOpenChange={(open) => { if (!open) setNewTxType(null); }}
          onSuccess={() => {
            setNewTxType(null);
            queryClient.invalidateQueries({ queryKey: ["saas-financial"] });
            queryClient.invalidateQueries({ queryKey: ["saas-metrics"] });
          }}
        />
      )}
    </div>
  );
}
