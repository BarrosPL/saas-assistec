import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subMonths, startOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

export function RevenueChart() {
  const { data: chartData = [], isLoading } = useQuery({
    queryKey: ["dashboard-revenue-chart"],
    queryFn: async () => {
      const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5)).toISOString().split("T")[0];

      const [salesRes, servicesRes] = await Promise.all([
        supabase
          .from("financial_transactions")
          .select("amount, transaction_date, category")
          .eq("transaction_type", "income")
          .gte("transaction_date", sixMonthsAgo),
        supabase
          .from("service_orders")
          .select("service_value, created_at")
          .neq("status", "cancelled")
          .gte("created_at", sixMonthsAgo),
      ]);

      if (salesRes.error) throw salesRes.error;
      if (servicesRes.error) throw servicesRes.error;

      // Build 6-month buckets
      const months: Record<string, { vendas: number; servicos: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const key = format(subMonths(new Date(), i), "yyyy-MM");
        months[key] = { vendas: 0, servicos: 0 };
      }

      salesRes.data.forEach((t) => {
        const key = t.transaction_date.substring(0, 7);
        if (months[key]) months[key].vendas += Number(t.amount);
      });

      servicesRes.data.forEach((o) => {
        const key = o.created_at.substring(0, 7);
        if (months[key]) months[key].servicos += Number(o.service_value || 0);
      });

      return Object.entries(months).map(([key, vals]) => ({
        name: format(new Date(key + "-01"), "MMM", { locale: ptBR }),
        vendas: vals.vendas,
        servicos: vals.servicos,
      }));
    },
  });

  return (
    <div className="dashboard-card p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Faturamento Mensal</h3>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">Receitas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-success" />
            <span className="text-muted-foreground">Serviços</span>
          </div>
        </div>
      </div>
      <div className="h-64">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickFormatter={(value) => `R$${value / 1000}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  boxShadow: "var(--shadow-md)",
                }}
                formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, ""]}
              />
              <Bar dataKey="vendas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="servicos" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
