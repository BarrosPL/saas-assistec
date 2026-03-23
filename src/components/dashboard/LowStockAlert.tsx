import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export function LowStockAlert() {
  const { data: lowStockItems = [], isLoading } = useQuery({
    queryKey: ["dashboard-low-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, quantity, min_stock")
        .order("quantity", { ascending: true })
        .limit(10);
      if (error) throw error;
      return data.filter((p) => p.quantity <= p.min_stock);
    },
  });

  return (
    <div className="rounded-xl border border-warning/30 bg-warning/5">
      <div className="flex items-center justify-between border-b border-warning/20 px-6 py-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <h3 className="font-semibold text-warning">Estoque Baixo</h3>
        </div>
        <Link to="/estoque">
          <Button variant="ghost" size="sm" className="gap-1 text-warning hover:text-warning">
            Ver estoque
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
      <div className="divide-y divide-warning/10">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="px-6 py-3">
              <Skeleton className="h-8 w-full" />
            </div>
          ))
        ) : lowStockItems.length === 0 ? (
          <p className="px-6 py-6 text-center text-sm text-muted-foreground">
            Nenhum produto com estoque baixo.
          </p>
        ) : (
          lowStockItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
                  <Package className="h-4 w-4 text-warning" />
                </div>
                <span className="text-sm font-medium">{item.name}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-warning">{item.quantity}</span>
                <span className="text-sm text-muted-foreground">/{item.min_stock}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
