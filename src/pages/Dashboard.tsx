import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentOrders } from "@/components/dashboard/RecentOrders";
import { LowStockAlert } from "@/components/dashboard/LowStockAlert";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { DollarSign, FileText, AlertCircle, Wrench } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, startOfMonth, subMonths } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const today = startOfDay(new Date()).toISOString();
  const monthStart = startOfMonth(new Date()).toISOString();
  const lastMonthStart = startOfMonth(subMonths(new Date(), 1)).toISOString();
  const lastMonthEnd = startOfMonth(new Date()).toISOString();

  const { data: todayRevenue = { total: 0, count: 0 } } = useQuery({
    queryKey: ["dashboard-today-revenue"],
    queryFn: async () => {
      const [transactionsResponse, ordersResponse] = await Promise.all([
        supabase
          .from("financial_transactions")
          .select("amount")
          .eq("transaction_type", "income")
          .gte("transaction_date", today.split("T")[0]),
        supabase
          .from("service_orders")
          .select("service_value")
          .gte("created_at", today)
      ]);

      if (transactionsResponse.error) throw transactionsResponse.error;
      if (ordersResponse.error) throw ordersResponse.error;

      const transactionsTotal = transactionsResponse.data.reduce(
        (sum, t) => sum + Number(t.amount || 0),
        0
      );

      const ordersTotal = ordersResponse.data.reduce(
        (sum, o) => sum + Number(o.service_value || 0),
        0
      );

      return {
        total: transactionsTotal + ordersTotal,
        count: transactionsResponse.data.length + ordersResponse.data.length,
      };
    },
  });

  const { data: openOrders = { total: 0, overdue: 0 } } = useQuery({
    queryKey: ["dashboard-open-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_orders")
        .select("id, estimated_deadline, status")
        .in("status", ["open", "diagnosis", "waiting_parts", "repairing"]);
      if (error) throw error;
      const now = new Date().toISOString().split("T")[0];
      const overdue = data.filter(
        (o) => o.estimated_deadline && o.estimated_deadline < now
      ).length;
      return { total: data.length, overdue };
    },
  });

  const { data: monthServices = { total: 0, revenue: 0 } } = useQuery({
    queryKey: ["dashboard-month-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_orders")
        .select("id, service_value")
        .gte("created_at", monthStart);
      if (error) throw error;
      return {
        total: data.length,
        revenue: data.reduce((sum, o) => sum + Number(o.service_value || 0), 0),
      };
    },
  });

  return (
    <MainLayout>
      <div className="space-y-6 lg:space-y-8">
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo de volta! Aqui está o resumo do seu negócio.
          </p>
        </div>

        <section>
          <h2 className="mb-4 text-lg font-semibold">Ações Rápidas</h2>
          <QuickActions />
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Faturamento Hoje"
            value={`R$ ${todayRevenue.total.toLocaleString("pt-BR")}`}
            description={`${todayRevenue.count} transações`}
            icon={DollarSign}
            variant="primary"
          />
          <StatCard
            title="OS Abertas"
            value={String(openOrders.total)}
            description={`${openOrders.overdue} em atraso`}
            icon={FileText}
          />
          <StatCard
            title="OS em Atraso"
            value={String(openOrders.overdue)}
            description="Atenção necessária"
            icon={AlertCircle}
            variant="warning"
          />
          <StatCard
            title="Serviços do Mês"
            value={String(monthServices.total)}
            description={`R$ ${monthServices.revenue.toLocaleString("pt-BR")} faturado`}
            icon={Wrench}
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RevenueChart />
          </div>
          <div>
            <LowStockAlert />
          </div>
        </div>

        <section>
          <RecentOrders />
        </section>
      </div>
    </MainLayout>
  );
}
