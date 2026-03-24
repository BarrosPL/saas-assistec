import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, Users, Package, DollarSign, Download,
  FileSpreadsheet, Calendar as CalendarIcon, Loader2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { exportToPDF, exportToExcel, formatCurrency, formatDate } from "@/lib/reportExport";
import type { DateRange } from "react-day-picker";

const STATUS_LABELS: Record<string, string> = {
  open: "Aberta",
  diagnosis: "Diagnóstico",
  waiting_parts: "Aguardando Peças",
  repairing: "Em Reparo",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export default function Reports() {
  const { user } = useAuth();
  const { data: companySettings } = useCompanySettings();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const periodLabel = useMemo(() => {
    if (!dateRange?.from) return "Selecionar Período";
    if (!dateRange.to) return format(dateRange.from, "dd/MM/yyyy");
    return `${format(dateRange.from, "dd/MM")} - ${format(dateRange.to, "dd/MM/yyyy")}`;
  }, [dateRange]);

  const periodForExport = useMemo(() => {
    if (!dateRange?.from) return "Todos";
    if (!dateRange.to) return format(dateRange.from, "dd/MM/yyyy");
    return `${format(dateRange.from, "dd/MM/yyyy")} a ${format(dateRange.to, "dd/MM/yyyy")}`;
  }, [dateRange]);

  const fromISO = dateRange?.from?.toISOString() ?? "";
  const toISO = dateRange?.to
    ? endOfMonth(dateRange.to).toISOString()
    : dateRange?.from
      ? endOfMonth(dateRange.from).toISOString()
      : "";

  // ─── OS Report ───
  const { data: osData, isLoading: osLoading } = useQuery({
    queryKey: ["report-os", fromISO, toISO],
    queryFn: async () => {
      let query = supabase
        .from("service_orders")
        .select("id, order_number, status, technician, service_value, created_at, device_brand, device_model, reported_issue, customer_id");

      if (fromISO) query = query.gte("created_at", fromISO);
      if (toISO) query = query.lte("created_at", toISO);

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!fromISO,
  });

  // ─── Financial Report ───
  const { data: financialData, isLoading: financialLoading } = useQuery({
    queryKey: ["report-financial", fromISO, toISO],
    queryFn: async () => {
      const fromDate = fromISO.split("T")[0];
      const toDate = toISO.split("T")[0];

      let txQuery = supabase
        .from("financial_transactions")
        .select("id, description, category, amount, transaction_type, transaction_date, payment_method");

      if (fromDate) txQuery = txQuery.gte("transaction_date", fromDate);
      if (toDate) txQuery = txQuery.lte("transaction_date", toDate);

      let soQuery = supabase
        .from("service_orders")
        .select("id, order_number, service_value, created_at")
        .neq("status", "cancelled")
        .not("service_value", "is", null);

      if (fromISO) soQuery = soQuery.gte("created_at", fromISO);
      if (toISO) soQuery = soQuery.lte("created_at", toISO);

      const [txRes, soRes] = await Promise.all([txQuery, soQuery]);
      if (txRes.error) throw txRes.error;
      if (soRes.error) throw soRes.error;

      return { transactions: txRes.data, serviceOrders: soRes.data };
    },
    enabled: !!user && !!fromISO,
  });

  // ─── Stock Report ───
  const { data: stockData, isLoading: stockLoading } = useQuery({
    queryKey: ["report-stock", fromISO, toISO],
    queryFn: async () => {
      const [productsRes, movementsRes] = await Promise.all([
        supabase.from("products").select("id, name, category, quantity, cost_price, sale_price, min_stock"),
        (() => {
          let q = supabase.from("stock_movements").select("id, product_id, quantity, movement_type, reason, created_at");
          if (fromISO) q = q.gte("created_at", fromISO);
          if (toISO) q = q.lte("created_at", toISO);
          return q;
        })(),
      ]);
      if (productsRes.error) throw productsRes.error;
      if (movementsRes.error) throw movementsRes.error;
      return { products: productsRes.data, movements: movementsRes.data };
    },
    enabled: !!user && !!fromISO,
  });

  // ─── Customers Report ───
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ["report-customers", fromISO, toISO],
    queryFn: async () => {
      let query = supabase.from("customers").select("id, name, phone, email, cpf, created_at");
      if (fromISO) query = query.gte("created_at", fromISO);
      if (toISO) query = query.lte("created_at", toISO);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!fromISO,
  });

  // ─── Quick Stats ───
  const prevMonthFrom = startOfMonth(subMonths(new Date(), 1)).toISOString();
  const prevMonthTo = endOfMonth(subMonths(new Date(), 1)).toISOString();
  const currMonthFrom = startOfMonth(new Date()).toISOString();
  const currMonthTo = endOfMonth(new Date()).toISOString();

  const { data: quickStats, isLoading: statsLoading } = useQuery({
    queryKey: ["report-quick-stats"],
    queryFn: async () => {
      const [osCurr, osPrev, custCurr, custPrev, txCurr, soCurr] = await Promise.all([
        supabase.from("service_orders").select("id", { count: "exact", head: true }).gte("created_at", currMonthFrom).lte("created_at", currMonthTo),
        supabase.from("service_orders").select("id", { count: "exact", head: true }).gte("created_at", prevMonthFrom).lte("created_at", prevMonthTo),
        supabase.from("customers").select("id", { count: "exact", head: true }).gte("created_at", currMonthFrom).lte("created_at", currMonthTo),
        supabase.from("customers").select("id", { count: "exact", head: true }).gte("created_at", prevMonthFrom).lte("created_at", prevMonthTo),
        supabase.from("financial_transactions").select("amount, transaction_type").gte("transaction_date", currMonthFrom.split("T")[0]).lte("transaction_date", currMonthTo.split("T")[0]),
        supabase.from("service_orders").select("service_value").neq("status", "cancelled").gte("created_at", currMonthFrom).lte("created_at", currMonthTo).not("service_value", "is", null),
      ]);

      const income = (txCurr.data ?? []).filter(t => t.transaction_type === "income").reduce((s, t) => s + Number(t.amount), 0)
        + (soCurr.data ?? []).reduce((s, o) => s + Number(o.service_value || 0), 0);
      const expense = (txCurr.data ?? []).filter(t => t.transaction_type === "expense").reduce((s, t) => s + Number(t.amount), 0);

      const osCount = osCurr.count ?? 0;
      const osPrevCount = osPrev.count ?? 0;
      const custCount = custCurr.count ?? 0;
      const custPrevCount = custPrev.count ?? 0;
      const profit = income - expense;
      const margin = income > 0 ? Math.round((profit / income) * 100) : 0;

      return {
        osCount,
        osChange: osPrevCount > 0 ? Math.round(((osCount - osPrevCount) / osPrevCount) * 100) : 0,
        revenue: income,
        profit,
        margin,
        newCustomers: custCount,
        custChange: custPrevCount > 0 ? Math.round(((custCount - custPrevCount) / custPrevCount) * 100) : 0,
      };
    },
    enabled: !!user,
  });

  // ─── Export Handlers ───
  const [exporting, setExporting] = useState<string | null>(null);

  const companyName = companySettings?.company_name || "Minha Empresa";

  function handleExportOS(type: "pdf" | "excel") {
    if (!osData) return;
    setExporting(`os-${type}`);
    try {
      const columns = ["Nº OS", "Status", "Técnico", "Equipamento", "Problema", "Valor", "Data"];
      const rows = osData.map(o => [
        String(o.order_number),
        STATUS_LABELS[o.status] || o.status,
        o.technician || "—",
        `${o.device_brand} ${o.device_model}`,
        o.reported_issue,
        formatCurrency(Number(o.service_value || 0)),
        formatDate(o.created_at),
      ]);
      const opts = { title: "Relatório de Ordens de Serviço", companyName, period: periodForExport, columns, rows, fileName: `relatorio_os_${Date.now()}` };
      type === "pdf" ? exportToPDF(opts) : exportToExcel(opts);
      toast.success(`Relatório de OS exportado em ${type.toUpperCase()}`);
    } catch { toast.error("Erro ao exportar relatório"); }
    setExporting(null);
  }

  function handleExportFinancial(type: "pdf" | "excel") {
    if (!financialData) return;
    setExporting(`fin-${type}`);
    try {
      const columns = ["Data", "Descrição", "Categoria", "Tipo", "Valor"];
      const allRows = [
        ...financialData.transactions.map(t => [
          formatDate(t.transaction_date),
          t.description,
          t.category,
          t.transaction_type === "income" ? "Entrada" : "Saída",
          formatCurrency(Number(t.amount)),
        ]),
        ...financialData.serviceOrders.map(o => [
          formatDate(o.created_at),
          `OS #${o.order_number}`,
          "Serviço",
          "Entrada",
          formatCurrency(Number(o.service_value || 0)),
        ]),
      ];
      const opts = { title: "Relatório Financeiro", companyName, period: periodForExport, columns, rows: allRows, fileName: `relatorio_financeiro_${Date.now()}` };
      type === "pdf" ? exportToPDF(opts) : exportToExcel(opts);
      toast.success(`Relatório Financeiro exportado em ${type.toUpperCase()}`);
    } catch { toast.error("Erro ao exportar relatório"); }
    setExporting(null);
  }

  function handleExportStock(type: "pdf" | "excel") {
    if (!stockData) return;
    setExporting(`stk-${type}`);
    try {
      const columns = ["Produto", "Categoria", "Qtd. Atual", "Estoque Mín.", "Custo Un.", "Venda Un.", "Valor Total"];
      const rows = stockData.products.map(p => [
        p.name,
        p.category,
        String(p.quantity),
        String(p.min_stock),
        formatCurrency(p.cost_price),
        formatCurrency(p.sale_price),
        formatCurrency(p.quantity * p.sale_price),
      ]);
      const opts = { title: "Relatório de Estoque", companyName, period: periodForExport, columns, rows, fileName: `relatorio_estoque_${Date.now()}` };
      type === "pdf" ? exportToPDF(opts) : exportToExcel(opts);
      toast.success(`Relatório de Estoque exportado em ${type.toUpperCase()}`);
    } catch { toast.error("Erro ao exportar relatório"); }
    setExporting(null);
  }

  function handleExportCustomers(type: "pdf" | "excel") {
    if (!customersData) return;
    setExporting(`cust-${type}`);
    try {
      const columns = ["Nome", "Telefone", "Email", "CPF", "Cadastro"];
      const rows = customersData.map(c => [
        c.name,
        c.phone,
        c.email || "—",
        c.cpf || "—",
        formatDate(c.created_at),
      ]);
      const opts = { title: "Relatório de Clientes", companyName, period: periodForExport, columns, rows, fileName: `relatorio_clientes_${Date.now()}` };
      type === "pdf" ? exportToPDF(opts) : exportToExcel(opts);
      toast.success(`Relatório de Clientes exportado em ${type.toUpperCase()}`);
    } catch { toast.error("Erro ao exportar relatório"); }
    setExporting(null);
  }

  const reports = [
    {
      title: "Relatório de OS",
      description: "Ordens de serviço por período, status e técnico",
      icon: FileText,
      color: "bg-primary/10 text-primary",
      count: osData?.length ?? 0,
      loading: osLoading,
      onExport: handleExportOS,
      exportKey: "os",
    },
    {
      title: "Relatório Financeiro",
      description: "Entradas, saídas, lucro e fluxo de caixa",
      icon: DollarSign,
      color: "bg-success/10 text-success",
      count: financialData ? financialData.transactions.length + financialData.serviceOrders.length : 0,
      loading: financialLoading,
      onExport: handleExportFinancial,
      exportKey: "fin",
    },
    {
      title: "Relatório de Estoque",
      description: "Produtos, movimentação e valorização",
      icon: Package,
      color: "bg-warning/10 text-warning",
      count: stockData?.products.length ?? 0,
      loading: stockLoading,
      onExport: handleExportStock,
      exportKey: "stk",
    },
    {
      title: "Relatório de Clientes",
      description: "Base de clientes, histórico e frequência",
      icon: Users,
      color: "bg-info/10 text-info",
      count: customersData?.length ?? 0,
      loading: customersLoading,
      onExport: handleExportCustomers,
      exportKey: "cust",
    },
  ];

  const currentMonthLabel = format(new Date(), "MMMM yyyy", { locale: ptBR });

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl">Relatórios</h1>
            <p className="text-muted-foreground">
              Gere relatórios detalhados do seu negócio
            </p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 w-full sm:w-auto">
                <CalendarIcon className="h-4 w-4" />
                {periodLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Report Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {reports.map((report) => (
            <Card key={report.title} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${report.color}`}>
                    <report.icon className="h-6 w-6" />
                  </div>
                  {report.loading ? (
                    <Skeleton className="h-6 w-16" />
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">
                      {report.count} registro{report.count !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <CardTitle className="text-lg">{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="gap-2"
                      disabled={report.loading || report.count === 0 || exporting === `${report.exportKey}-pdf`}
                      onClick={() => report.onExport("pdf")}
                    >
                      {exporting === `${report.exportKey}-pdf` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="gap-2"
                      disabled={report.loading || report.count === 0 || exporting === `${report.exportKey}-excel`}
                      onClick={() => report.onExport("excel")}
                    >
                      {exporting === `${report.exportKey}-excel` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4" />
                      )}
                      Excel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="capitalize">
              Estatísticas Rápidas — {currentMonthLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Total de OS</p>
                {statsLoading ? (
                  <Skeleton className="mt-1 h-8 w-16" />
                ) : (
                  <>
                    <p className="text-2xl font-bold">{quickStats?.osCount ?? 0}</p>
                    <p className={`text-xs ${(quickStats?.osChange ?? 0) >= 0 ? "text-success" : "text-destructive"}`}>
                      {(quickStats?.osChange ?? 0) >= 0 ? "+" : ""}{quickStats?.osChange ?? 0}% vs mês anterior
                    </p>
                  </>
                )}
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Faturamento</p>
                {statsLoading ? (
                  <Skeleton className="mt-1 h-8 w-24" />
                ) : (
                  <>
                    <p className="text-2xl font-bold">{formatCurrency(quickStats?.revenue ?? 0)}</p>
                    <p className="text-xs text-muted-foreground">Mês atual</p>
                  </>
                )}
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Novos Clientes</p>
                {statsLoading ? (
                  <Skeleton className="mt-1 h-8 w-16" />
                ) : (
                  <>
                    <p className="text-2xl font-bold">{quickStats?.newCustomers ?? 0}</p>
                    <p className={`text-xs ${(quickStats?.custChange ?? 0) >= 0 ? "text-success" : "text-destructive"}`}>
                      {(quickStats?.custChange ?? 0) >= 0 ? "+" : ""}{quickStats?.custChange ?? 0}% vs mês anterior
                    </p>
                  </>
                )}
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Lucro Estimado</p>
                {statsLoading ? (
                  <Skeleton className="mt-1 h-8 w-24" />
                ) : (
                  <>
                    <p className="text-2xl font-bold">{formatCurrency(quickStats?.profit ?? 0)}</p>
                    <p className="text-xs text-success">Margem: {quickStats?.margin ?? 0}%</p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
