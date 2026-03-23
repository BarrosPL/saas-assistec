import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, Package, DollarSign, Download, FileSpreadsheet, Calendar } from "lucide-react";

const reports = [
  {
    title: "Relatório de OS",
    description: "Ordens de serviço por período, status e técnico",
    icon: FileText,
    color: "bg-primary/10 text-primary",
  },
  {
    title: "Relatório Financeiro",
    description: "Entradas, saídas, lucro e fluxo de caixa",
    icon: DollarSign,
    color: "bg-success/10 text-success",
  },
  {
    title: "Relatório de Estoque",
    description: "Produtos, movimentação e valorização",
    icon: Package,
    color: "bg-warning/10 text-warning",
  },
  {
    title: "Relatório de Clientes",
    description: "Base de clientes, histórico e frequência",
    icon: Users,
    color: "bg-info/10 text-info",
  },
];

export default function Reports() {
  return (
    <MainLayout>
      <div className="space-y-6 pt-12 lg:pt-0">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">Relatórios</h1>
          <p className="text-muted-foreground">
            Gere relatórios detalhados do seu negócio
          </p>
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
                </div>
                <CardTitle className="text-lg">{report.title}</CardTitle>
                <CardDescription>{report.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    Selecionar Período
                  </Button>
                  <div className="flex gap-2">
                    <Button size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      PDF
                    </Button>
                    <Button size="sm" variant="secondary" className="gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
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
            <CardTitle>Estatísticas Rápidas - Janeiro 2024</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Total de OS</p>
                <p className="text-2xl font-bold">47</p>
                <p className="text-xs text-success">+12% vs mês anterior</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Faturamento</p>
                <p className="text-2xl font-bold">R$ 19.450</p>
                <p className="text-xs text-success">+8% vs mês anterior</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Novos Clientes</p>
                <p className="text-2xl font-bold">23</p>
                <p className="text-xs text-success">+15% vs mês anterior</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Lucro Estimado</p>
                <p className="text-2xl font-bold">R$ 7.280</p>
                <p className="text-xs text-success">Margem: 37%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
