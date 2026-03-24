import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, ShoppingCart, CreditCard, Banknote, QrCode, Receipt, Printer } from "lucide-react";
import { Link } from "react-router-dom";
import { generateSaleReceipt } from "@/components/sales/generateSaleReceipt";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isToday } from "date-fns";
import type { Json } from "@/integrations/supabase/types";

const paymentMethodConfig: Record<string, { label: string; icon: typeof Banknote; color: string }> = {
  cash: { label: "Dinheiro", icon: Banknote, color: "text-success" },
  pix: { label: "Pix", icon: QrCode, color: "text-primary" },
  credit_card: { label: "Crédito", icon: CreditCard, color: "text-info" },
  debit_card: { label: "Débito", icon: CreditCard, color: "text-warning" },
};

export default function Sales() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: companySettings } = useCompanySettings();

  const handleReprint = (sale: typeof sales[0]) => {
    const items = Array.isArray(sale.items)
      ? (sale.items as any[]).map((item) => ({
          name: item.name || item.product_name || "Produto",
          price: Number(item.price || item.sale_price || 0),
          quantity: Number(item.quantity || 1),
        }))
      : [];

    generateSaleReceipt({
      saleNumber: sale.sale_number,
      items,
      subtotal: Number(sale.subtotal),
      discount: Number(sale.discount),
      total: Number(sale.total),
      paymentMethod: sale.payment_method,
      customerName: sale.customerName || undefined,
      notes: sale.notes || undefined,
      createdAt: new Date(sale.created_at),
      company: companySettings,
    });
    toast.success("Cupom gerado para impressão!");
  };

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("sales")
        .select("*, customer:customers(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((s) => ({
        ...s,
        customerName: (s.customer as { name: string } | null)?.name || null,
        itemCount: Array.isArray(s.items) ? (s.items as Json[]).length : 0,
      }));
    },
    enabled: !!user,
  });

  const filteredSales = sales.filter(
    (sale) =>
      String(sale.sale_number).includes(searchQuery) ||
      (sale.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const todaySales = useMemo(() => sales.filter((s) => isToday(new Date(s.created_at))), [sales]);
  const todayTotal = useMemo(() => todaySales.reduce((acc, s) => acc + Number(s.total), 0), [todaySales]);
  const todayCount = todaySales.length;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl">Vendas</h1>
            <p className="text-muted-foreground">Ponto de venda e histórico</p>
          </div>
          <Link to="/vendas/nova">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Venda
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vendas Hoje</p>
                <p className="text-2xl font-bold">{todayCount}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <Banknote className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Faturamento Hoje</p>
                <p className="text-2xl font-bold">
                  R$ {todayTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
                <Receipt className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold">
                  R$ {todayCount > 0 ? (todayTotal / todayCount).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "0,00"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por número da venda ou cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Nenhuma venda encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Venda</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead className="hidden md:table-cell">Cliente</TableHead>
                  <TableHead className="text-center">Itens</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => {
                  const config = paymentMethodConfig[sale.payment_method] || paymentMethodConfig.cash;
                  const PaymentIcon = config.icon;

                  return (
                    <TableRow key={sale.id}>
                      <TableCell className="font-semibold text-primary">
                        V-{String(sale.sale_number).padStart(3, "0")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(sale.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {sale.customerName || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-center">{sale.itemCount}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1.5">
                          <PaymentIcon className={`h-3 w-3 ${config.color}`} />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {Number(sale.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Reimprimir cupom"
                          onClick={() => handleReprint(sale)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
