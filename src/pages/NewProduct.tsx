import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Package, BoxIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const formSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(200),
  category: z.string().min(1, "Categoria é obrigatória").max(100),
  brandModel: z.string().max(100).optional(),
  internalCode: z.string().max(50).optional(),
  costPrice: z.number().min(0, "Preço de custo inválido"),
  salePrice: z.number().min(0, "Preço de venda inválido"),
  minStock: z.number().int().min(0, "Estoque mínimo inválido"),
  initialStock: z.number().int().min(0, "Quantidade inválida"),
});

const categories = [
  "Tela",
  "Bateria",
  "Conector",
  "Placa",
  "Câmera",
  "Alto-falante",
  "Microfone",
  "Acessório",
  "Película",
  "Capa",
  "Ferramenta",
  "Outro",
];

export default function NewProduct() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [brandModel, setBrandModel] = useState("");
  const [internalCode, setInternalCode] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [minStock, setMinStock] = useState("5");
  const [initialStock, setInitialStock] = useState("0");
  const [stockReason, setStockReason] = useState("Estoque inicial");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const margin =
    costPrice && salePrice
      ? (((parseFloat(salePrice) - parseFloat(costPrice)) / parseFloat(costPrice)) * 100).toFixed(1)
      : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const parsed = formSchema.safeParse({
      name,
      category,
      brandModel: brandModel || undefined,
      internalCode: internalCode || undefined,
      costPrice: costPrice ? parseFloat(costPrice) : 0,
      salePrice: salePrice ? parseFloat(salePrice) : 0,
      minStock: parseInt(minStock) || 0,
      initialStock: parseInt(initialStock) || 0,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.errors.forEach((err) => {
        fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSaving(true);

    // Insert product
    const { data: product, error: productError } = await supabase
      .from("products")
      .insert({
        user_id: user.id,
        name: name.trim(),
        category,
        brand_model: brandModel.trim() || null,
        internal_code: internalCode.trim() || null,
        cost_price: parseFloat(costPrice) || 0,
        sale_price: parseFloat(salePrice) || 0,
        min_stock: parseInt(minStock) || 5,
        quantity: 0, // will be updated by stock movement trigger
      })
      .select("id")
      .single();

    if (productError) {
      setSaving(false);
      toast({ title: "Erro ao cadastrar produto", description: productError.message, variant: "destructive" });
      return;
    }

    // If initial stock > 0, create a stock entry movement
    const qty = parseInt(initialStock) || 0;
    if (qty > 0 && product) {
      const { error: movError } = await supabase.from("stock_movements").insert({
        user_id: user.id,
        product_id: product.id,
        movement_type: "entry" as const,
        quantity: qty,
        reason: stockReason.trim() || "Estoque inicial",
      });

      if (movError) {
        toast({
          title: "Produto criado, mas erro na entrada de estoque",
          description: movError.message,
          variant: "destructive",
        });
        setSaving(false);
        navigate("/estoque");
        return;
      }
    }

    setSaving(false);
    toast({ title: "Produto cadastrado!", description: `${name} foi adicionado ao estoque.` });
    navigate("/estoque");
  };

  return (
    <MainLayout>
      <div className="space-y-6 pt-12 lg:pt-0 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/estoque")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl">Novo Produto</h1>
            <p className="text-muted-foreground">Cadastre um novo produto ou peça no estoque</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Info */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5 text-primary" />
                Informações do Produto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Produto *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Tela iPhone 14 Pro Max"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={200}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className={errors.category ? "border-destructive" : ""}>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brandModel">Marca / Modelo</Label>
                  <Input
                    id="brandModel"
                    placeholder="Ex: Apple, Samsung..."
                    value={brandModel}
                    onChange={(e) => setBrandModel(e.target.value)}
                    maxLength={100}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Código Interno</Label>
                <Input
                  id="code"
                  placeholder="Ex: TL-IP14PM"
                  value={internalCode}
                  onChange={(e) => setInternalCode(e.target.value)}
                  maxLength={50}
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                💰 Preços
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="costPrice">Preço de Custo (R$) *</Label>
                  <Input
                    id="costPrice"
                    type="number"
                    placeholder="0,00"
                    min="0"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className={errors.costPrice ? "border-destructive" : ""}
                  />
                  {errors.costPrice && <p className="text-sm text-destructive">{errors.costPrice}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salePrice">Preço de Venda (R$) *</Label>
                  <Input
                    id="salePrice"
                    type="number"
                    placeholder="0,00"
                    min="0"
                    step="0.01"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className={errors.salePrice ? "border-destructive" : ""}
                  />
                  {errors.salePrice && <p className="text-sm text-destructive">{errors.salePrice}</p>}
                </div>
              </div>
              {margin && parseFloat(costPrice) > 0 && (
                <p className="text-sm text-muted-foreground">
                  Margem de lucro:{" "}
                  <span className={parseFloat(margin) > 0 ? "text-success font-semibold" : "text-destructive font-semibold"}>
                    {margin}%
                  </span>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Stock */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BoxIcon className="h-5 w-5 text-primary" />
                Estoque
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minStock">Estoque Mínimo</Label>
                  <Input
                    id="minStock"
                    type="number"
                    min="0"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Alerta quando o estoque atingir esse valor</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="initialStock">Quantidade Inicial</Label>
                  <Input
                    id="initialStock"
                    type="number"
                    min="0"
                    value={initialStock}
                    onChange={(e) => setInitialStock(e.target.value)}
                    className={errors.initialStock ? "border-destructive" : ""}
                  />
                  {errors.initialStock && <p className="text-sm text-destructive">{errors.initialStock}</p>}
                </div>
              </div>

              {parseInt(initialStock) > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="stockReason">Motivo da Entrada</Label>
                  <Input
                    id="stockReason"
                    placeholder="Ex: Compra de fornecedor"
                    value={stockReason}
                    onChange={(e) => setStockReason(e.target.value)}
                    maxLength={200}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pb-6">
            <Button type="button" variant="outline" onClick={() => navigate("/estoque")}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : "Cadastrar Produto"}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
