import { useState } from "react";
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
import { Plus, Search, MoreVertical, Package, AlertTriangle, TrendingDown, TrendingUp, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import { EditProductDialog } from "@/components/inventory/EditProductDialog";
import { StockMovementDialog } from "@/components/inventory/StockMovementDialog";
import { DeleteProductDialog } from "@/components/inventory/DeleteProductDialog";

type Product = Tables<"products">;

export default function Inventory() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [movementType, setMovementType] = useState<"entry" | "exit">("entry");
  const [movementOpen, setMovementOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!user,
  });

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.internal_code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.brand_model || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getStockStatus = (quantity: number, minStock: number) => {
    if (quantity === 0) return { label: "Esgotado", variant: "destructive" as const, icon: AlertTriangle };
    if (quantity <= minStock) return { label: "Baixo", variant: "secondary" as const, icon: TrendingDown };
    return { label: "Normal", variant: "outline" as const, icon: TrendingUp };
  };

  const categories = [...new Set(products.map((p) => p.category))];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl">Estoque</h1>
            <p className="text-muted-foreground">Controle de produtos e peças</p>
          </div>
          <Link to="/estoque/novo">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Produto
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Produtos</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estoque Baixo</p>
                <p className="text-2xl font-bold">
                  {products.filter((p) => p.quantity <= p.min_stock).length}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor em Estoque</p>
                <p className="text-2xl font-bold">
                  R$ {products.reduce((acc, p) => acc + p.cost_price * p.quantity, 0).toLocaleString("pt-BR")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, código ou marca..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                {products.length === 0 ? "Nenhum produto cadastrado ainda" : "Nenhum produto encontrado"}
              </p>
              {products.length === 0 && (
                <Link to="/estoque/novo">
                  <Button variant="outline" className="mt-3 gap-2">
                    <Plus className="h-4 w-4" />
                    Cadastrar primeiro produto
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="hidden md:table-cell">Categoria</TableHead>
                  <TableHead className="hidden lg:table-cell">Código</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Custo</TableHead>
                  <TableHead className="text-right">Venda</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product.quantity, product.min_stock);
                  const StockIcon = stockStatus.icon;

                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.brand_model || "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">{product.category}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell font-mono text-sm text-muted-foreground">
                        {product.internal_code || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={cn(
                            "font-semibold",
                            product.quantity <= product.min_stock && "text-warning",
                            product.quantity === 0 && "text-destructive"
                          )}
                        >
                          {product.quantity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={stockStatus.variant}
                          className={cn(
                            "gap-1",
                            stockStatus.label === "Baixo" && "bg-warning/10 text-warning border-warning/30",
                            stockStatus.label === "Esgotado" && "bg-destructive/10 text-destructive border-destructive/30"
                          )}
                        >
                          <StockIcon className="h-3 w-3" />
                          {stockStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-right text-muted-foreground">
                        R$ {product.cost_price.toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {product.sale_price.toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedProduct(product); setEditOpen(true); }}>Editar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedProduct(product); setMovementType("entry"); setMovementOpen(true); }}>Entrada de estoque</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedProduct(product); setMovementType("exit"); setMovementOpen(true); }}>Saída de estoque</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => { setSelectedProduct(product); setDeleteOpen(true); }}>Excluir</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        <EditProductDialog product={selectedProduct} open={editOpen} onOpenChange={setEditOpen} />
        <StockMovementDialog product={selectedProduct} type={movementType} open={movementOpen} onOpenChange={setMovementOpen} />
        <DeleteProductDialog product={selectedProduct} open={deleteOpen} onOpenChange={setDeleteOpen} />
      </div>
    </MainLayout>
  );
}
