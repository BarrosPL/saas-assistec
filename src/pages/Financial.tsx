import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Wallet, Wrench, ShoppingCart } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subMonths, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { NewTransactionDialog } from "@/components/financial/NewTransactionDialog";

const CATEGORY_COLORS: Record<string, string> = {
  Fornecedor: "hsl(var(--primary))",
  Aluguel: "hsl(var(--warning, 38 92% 50%))",
  Salários: "hsl(var(--success))",
  Serviço: "hsl(var(--primary))",
  Venda: "hsl(var(--success))",
  Despesa: "hsl(var(--destructive))",
};

function getColor(category: string, idx: number) {
  if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
  const fallback = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];
  return fallback[idx % fallback.length];
}

export default function Financial() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newTxType, setNewTxType] = useState<"income" | "expense" | null>(null);

  // Fetch transactions
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["financial-transactions"],
    queryFn: async () => {
      const [txResponse, soResponse] = await Promise.all([
        supabase
          .from("financial_transactions")
          .select("*")
          .order("transaction_date", { ascending: false })
          .limit(50),
        supabase
          .from("service_orders")
          .select("*")
          .not("service_value", "is", null)
          .order("created_at", { ascending: false })
          .limit(50)
      ]);

      if (txResponse.error) throw txResponse.error;
      if (soResponse.error) throw soResponse.error;

      const formattedOrders = soResponse.data.map(order => ({
        id: `so-${order.id}`,
        transaction_date: order.created_at,
        description: `Ordem de Serviço #${order.order_number}`,
        category: "Serviço",
        transaction_type: "income" as const,
        amount: order.service_value || 0,
        payment_method: null,
        user_id: order.user_id,
        created_at: order.created_at,
        sale_id: null,
        service_order_id: order.id
      }));

      const allTransactions = [...txResponse.data, ...formattedOrders]
        .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
        .slice(0, 50);

      return allTransactions;
    },
    enabled: !!user,
  });

  // Monthly chart data (last 6 months)
  const { data: chartData = [] } = useQuery({
    queryKey: ["financial-chart"],
    queryFn: async () => {
      const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5)).toISOString().split("T")[0];
      const [txResponse, soResponse] = await Promise.all([
        supabase
          .from("financial_transactions")
          .select("amount, transaction_date, transaction_type")
          .gte("transaction_date", sixMonthsAgo),
        supabase
          .from("service_orders")
          .select("service_value, created_at")
          .gte("created_at", sixMonthsAgo)
      ]);

      if (txResponse.error) throw txResponse.error;
      if (soResponse.error) throw soResponse.error;

      const months: Record<string, { entradas: number; saidas: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const key = format(subMonths(new Date(), i), "yyyy-MM");
        months[key] = { entradas: 0, saidas: 0 };
      }

      txResponse.data.forEach((t) => {
        const key = t.transaction_date.substring(0, 7);
        if (!months[key]) return;
        if (t.transaction_type === "income") months[key].entradas += Number(t.amount);
        else months[key].saidas += Number(t.amount);
      });

      soResponse.data.forEach((o) => {
        const key = o.created_at.substring(0, 7);
        if (!months[key]) return;
        months[key].entradas += Number(o.service_value || 0);
      });

      return Object.entries(months).map(([key, vals]) => ({
        name: format(new Date(key + "-01"), "MMM", { locale: ptBR }),
        entradas: vals.entradas,
        saidas: vals.saidas,
      }));
    },
    enabled: !!user,
  });

  // Expense categories for pie chart
  const expenseCategories = (() => {
    const map: Record<string, number> = {};
    transactions.filter(t => t.transaction_type === "expense").forEach(t => {
      map[t.category] = (map[t.category] || 0) + Number(t.amount);
    });
    return Object.entries(map).map(([name, value], idx) => ({
      name, value, color: getColor(name, idx),
    }));
  })();

  const totalIncome = transactions.filter(t => t.transaction_type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.transaction_type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const totalServices = transactions.filter(t => t.transaction_type === "income" && t.category === "Serviço").reduce((s, t) => s + Number(t.amount), 0);
  const totalSales = transactions.filter(t => t.transaction_type === "income" && t.category === "Venda").reduce((s, t) => s + Number(t.amount), 0);
  const balance = totalIncome - totalExpense;

  const paymentLabel: Record<string, string> = {
    cash: "Dinheiro", pix: "Pix", credit_card: "Crédito", debit_card: "Débito",
  };

  return (
    <MainLayout>
      <div className="space-y-6 pt-12 lg:pt-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl">Financeiro</h1>
            <p className="text-muted-foreground">Controle de entradas e saídas</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setNewTxType("expense")}>
              <ArrowDownRight className="h-4 w-4 text-destructive" />
              Nova Despesa
            </Button>
            <Button className="gap-2" onClick={() => setNewTxType("income")}>
              <ArrowUpRight className="h-4 w-4" />
              Nova Entrada
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-l-4 border-l-success">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entradas</p>
                  <p className="text-2xl font-bold text-success">
                    {isLoading ? <Skeleton className="h-8 w-24" /> : `R$ ${totalIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-destructive">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saídas</p>
                  <p className="text-2xl font-bold text-destructive">
                    {isLoading ? <Skeleton className="h-8 w-24" /> : `R$ ${totalExpense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saldo</p>
                  <p className="text-2xl font-bold">
                    {isLoading ? <Skeleton className="h-8 w-24" /> : `R$ ${balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Income Stats */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-l-4 border-l-primary/60 bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Wrench className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entradas (Serviços / OS)</p>
                  <p className="text-xl font-bold text-primary">
                    {isLoading ? <Skeleton className="h-6 w-24" /> : `R$ ${totalServices.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-success/60 bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <ShoppingCart className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entradas (Vendas)</p>
                  <p className="text-xl font-bold text-success">
                    {isLoading ? <Skeleton className="h-6 w-24" /> : `R$ ${totalSales.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Fluxo de Caixa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `R$${v / 1000}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                      formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, ""]}
                    />
                    <Bar dataKey="entradas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Entradas" />
                    <Bar dataKey="saidas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Saídas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Despesas por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                {expenseCategories.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expenseCategories} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value">
                        {expenseCategories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Nenhuma despesa registrada</div>
                )}
              </div>
              <div className="mt-4 space-y-2">
                {expenseCategories.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span>{cat.name}</span>
                    </div>
                    <span className="font-medium">R$ {cat.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Transações Recentes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">Nenhuma transação encontrada</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="hidden md:table-cell">Categoria</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(t.transaction_date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="font-medium">{t.description}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">{t.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={t.transaction_type === "income" ? "default" : "destructive"}
                          className={t.transaction_type === "income" ? "bg-success hover:bg-success/90" : ""}
                        >
                          {t.transaction_type === "income" ? "Entrada" : "Saída"}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${t.transaction_type === "income" ? "text-success" : "text-destructive"}`}>
                        {t.transaction_type === "income" ? "+" : "-"} R$ {Number(t.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {newTxType && (
        <NewTransactionDialog
          type={newTxType}
          open={!!newTxType}
          onOpenChange={(open) => { if (!open) setNewTxType(null); }}
          onSuccess={() => {
            setNewTxType(null);
            queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
            queryClient.invalidateQueries({ queryKey: ["financial-chart"] });
          }}
        />
      )}
    </MainLayout>
  );
}
