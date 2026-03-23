import { Link } from "react-router-dom";
import { Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

const statusConfig: Record<OrderStatus, { label: string; class: string }> = {
  open: { label: "Aberta", class: "status-open" },
  diagnosis: { label: "Diagnóstico", class: "status-diagnosis" },
  waiting_parts: { label: "Aguardando Peça", class: "status-waiting" },
  repairing: { label: "Em Reparo", class: "status-repair" },
  completed: { label: "Concluída", class: "status-completed" },
  cancelled: { label: "Cancelada", class: "status-cancelled" },
};

export function RecentOrders() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["dashboard-recent-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_orders")
        .select("id, order_number, device_model, status, created_at, customers(name)")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="dashboard-card">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Ordens de Serviço Recentes</h3>
        </div>
        <Link to="/ordens">
          <Button variant="ghost" size="sm" className="gap-1 text-primary hover:text-primary">
            Ver todas
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
      <div className="divide-y">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="px-6 py-4">
              <Skeleton className="h-10 w-full" />
            </div>
          ))
        ) : orders.length === 0 ? (
          <p className="px-6 py-8 text-center text-muted-foreground">Nenhuma ordem encontrada.</p>
        ) : (
          orders.map((order) => {
            const orderNum = `OS-${String(order.order_number).padStart(3, "0")}`;
            const customerName = (order.customers as any)?.name || "Sem cliente";
            const timeAgo = formatDistanceToNow(new Date(order.created_at), {
              addSuffix: true,
              locale: ptBR,
            });
            return (
              <Link
                key={order.id}
                to={`/ordens/${order.id}`}
                className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium text-foreground">{orderNum}</p>
                  <p className="text-sm text-muted-foreground">{customerName}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden text-right sm:block">
                    <p className="text-sm font-medium">{order.device_model}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo}</p>
                  </div>
                  <span className={cn("status-badge", statusConfig[order.status].class)}>
                    {statusConfig[order.status].label}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
