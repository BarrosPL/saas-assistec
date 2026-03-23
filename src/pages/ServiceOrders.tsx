import { useState } from "react";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreVertical, Smartphone, Calendar, User, ClipboardList, FileText, Pencil, RefreshCw, XCircle, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";
import { OrderDetailDialog } from "@/components/service-orders/OrderDetailDialog";
import { EditOrderDialog } from "@/components/service-orders/EditOrderDialog";
import { ChangeStatusDialog } from "@/components/service-orders/ChangeStatusDialog";
import { CancelOrderDialog } from "@/components/service-orders/CancelOrderDialog";
import { generateOrderPdf } from "@/components/service-orders/generateOrderPdf";

type OrderStatus = Database["public"]["Enums"]["order_status"];

const statusConfig: Record<OrderStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  open: { label: "Aberta", variant: "outline" },
  diagnosis: { label: "Diagnóstico", variant: "secondary" },
  waiting_parts: { label: "Aguardando Peça", variant: "secondary" },
  repairing: { label: "Em Reparo", variant: "default" },
  completed: { label: "Concluída", variant: "default" },
  cancelled: { label: "Cancelada", variant: "destructive" },
};

export default function ServiceOrders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [dialogType, setDialogType] = useState<"detail" | "edit" | "status" | "cancel" | null>(null);

  const { data: companySettings } = useCompanySettings();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["service-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_orders")
        .select("*, customers(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredOrders = orders.filter((order) => {
    const customerName = (order.customers as any)?.name || "";
    const orderNum = `OS-${String(order.order_number).padStart(3, "0")}`;
    const matchesSearch =
      orderNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.device_model.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openDialog = (order: any, type: "detail" | "edit" | "status" | "cancel") => {
    setSelectedOrder(order);
    setDialogType(type);
  };

  const closeDialog = () => {
    setDialogType(null);
    setSelectedOrder(null);
  };

  return (
    <MainLayout>
      <div className="space-y-6 pt-12 lg:pt-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl">Ordens de Serviço</h1>
            <p className="text-muted-foreground">Gerencie todas as ordens de serviço</p>
          </div>
          <Link to="/ordens/nova">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova OS
            </Button>
          </Link>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por OS, cliente ou aparelho..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="open">Aberta</SelectItem>
              <SelectItem value="diagnosis">Diagnóstico</SelectItem>
              <SelectItem value="waiting_parts">Aguardando Peça</SelectItem>
              <SelectItem value="repairing">Em Reparo</SelectItem>
              <SelectItem value="completed">Concluída</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="rounded-xl border bg-card p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-xl border bg-card p-12 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Nenhuma ordem encontrada</h3>
            <p className="mt-2 text-muted-foreground">
              {searchQuery || statusFilter !== "all"
                ? "Tente ajustar os filtros de busca."
                : "Crie sua primeira ordem de serviço."}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Link to="/ordens/nova">
                <Button className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  Nova OS
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="rounded-xl border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OS / Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Aparelho</TableHead>
                  <TableHead className="hidden lg:table-cell">Defeito</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Prazo</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Valor</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => {
                  const orderNum = `OS-${String(order.order_number).padStart(3, "0")}`;
                  const customerName = (order.customers as any)?.name || "Cliente não informado";
                  return (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-primary">{orderNum}</p>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <User className="h-3 w-3" />
                            {customerName}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{order.device_model}</p>
                            <p className="text-xs text-muted-foreground">{order.device_brand}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-48">
                        <p className="truncate text-muted-foreground">{order.reported_issue}</p>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusConfig[order.status].variant}
                          className={cn(
                            order.status === "completed" && "bg-success hover:bg-success/90",
                            order.status === "repairing" && "bg-primary hover:bg-primary/90",
                            order.status === "waiting_parts" && "bg-warning hover:bg-warning/90 text-warning-foreground"
                          )}
                        >
                          {statusConfig[order.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {order.estimated_deadline
                            ? format(new Date(order.estimated_deadline), "dd/MM/yyyy")
                            : "—"}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-right font-medium">
                        {order.service_value
                          ? `R$ ${Number(order.service_value).toLocaleString("pt-BR")}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDialog(order, "detail")}>
                              <Eye className="h-4 w-4 mr-2" /> Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDialog(order, "edit")}>
                              <Pencil className="h-4 w-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDialog(order, "status")}>
                              <RefreshCw className="h-4 w-4 mr-2" /> Alterar status
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => generateOrderPdf(order, companySettings)}>
                              <FileText className="h-4 w-4 mr-2" /> Gerar PDF
                            </DropdownMenuItem>
                            {order.status !== "cancelled" && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => openDialog(order, "cancel")}
                              >
                                <XCircle className="h-4 w-4 mr-2" /> Cancelar OS
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Dialogs */}
      {selectedOrder && dialogType === "detail" && (
        <OrderDetailDialog order={selectedOrder} open onOpenChange={closeDialog} />
      )}
      {selectedOrder && dialogType === "edit" && (
        <EditOrderDialog order={selectedOrder} open onOpenChange={closeDialog} />
      )}
      {selectedOrder && dialogType === "status" && (
        <ChangeStatusDialog order={selectedOrder} open onOpenChange={closeDialog} />
      )}
      {selectedOrder && dialogType === "cancel" && (
        <CancelOrderDialog order={selectedOrder} open onOpenChange={closeDialog} />
      )}
    </MainLayout>
  );
}
