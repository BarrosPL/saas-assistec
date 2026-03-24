import { useState, useEffect, useMemo } from "react";
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
import {
  ArrowLeft,
  Save,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Banknote,
  QrCode,
  CreditCard,
  User,
  Package,
} from "lucide-react";
import { CustomerSearch } from "@/components/service-orders/CustomerSearch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { generateSaleReceipt } from "@/components/sales/generateSaleReceipt";
import { useCompanySettings } from "@/hooks/useCompanySettings";

interface CartItem {
  productId: string;
  name: string;
  salePrice: number;
  quantity: number;
  availableStock: number;
}

const paymentMethods = [
  { value: "cash", label: "Dinheiro", icon: Banknote },
  { value: "pix", label: "Pix", icon: QrCode },
  { value: "credit_card", label: "Cartão de Crédito", icon: CreditCard },
  { value: "debit_card", label: "Cartão de Débito", icon: CreditCard },
] as const;

export default function NewSale() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: companySettings } = useCompanySettings();

  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string; name: string; phone: string; email: string | null; cpf: string | null;
  } | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  const { data: products = [] } = useQuery({
    queryKey: ["products-pdv", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sale_price, quantity, category, brand_model")
        .eq("user_id", user.id)
        .gt("quantity", 0)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filteredProducts = useMemo(() => {
    if (productSearch.length < 1) return [];
    const q = productSearch.toLowerCase();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.brand_model?.toLowerCase().includes(q) ?? false) ||
          p.category.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [products, productSearch]);

  const addToCart = (product: typeof products[number]) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) {
          toast.error("Estoque insuficiente");
          return prev;
        }
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          salePrice: Number(product.sale_price),
          quantity: 1,
          availableStock: product.quantity,
        },
      ];
    });
    setProductSearch("");
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId !== productId) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.availableStock) {
            toast.error("Estoque insuficiente");
            return item;
          }
          return { ...item, quantity: newQty };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const subtotal = useMemo(
    () => cart.reduce((acc, i) => acc + i.salePrice * i.quantity, 0),
    [cart]
  );
  const discountValue = parseFloat(discount) || 0;
  const total = Math.max(subtotal - discountValue, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (cart.length === 0) {
      toast.error("Adicione pelo menos um produto ao carrinho");
      return;
    }
    if (!paymentMethod) {
      toast.error("Selecione a forma de pagamento");
      return;
    }

    setSaving(true);
    try {
      const itemsJson = cart.map((i) => ({
        product_id: i.productId,
        name: i.name,
        price: i.salePrice,
        quantity: i.quantity,
      }));

      const { data: saleData, error: saleError } = await supabase.from("sales").insert({
        user_id: user.id,
        customer_id: selectedCustomer?.id || null,
        payment_method: paymentMethod as any,
        items: itemsJson,
        subtotal,
        discount: discountValue,
        total,
        notes: notes.trim() || null,
      }).select("sale_number").single();

      if (saleError) throw saleError;

      // Create stock movements for each item
      for (const item of cart) {
        await supabase.from("stock_movements").insert({
          user_id: user.id,
          product_id: item.productId,
          movement_type: "exit",
          quantity: item.quantity,
          reason: "Venda",
        });
      }

      // Register financial transaction
      await supabase.from("financial_transactions").insert({
        user_id: user.id,
        transaction_type: "income",
        amount: total,
        category: "Venda",
        description: `Venda #${saleData.sale_number} - ${cart.length} item(ns)`,
        payment_method: paymentMethod as any,
      });

      // Generate receipt
      generateSaleReceipt({
        saleNumber: saleData.sale_number,
        items: cart.map((i) => ({ name: i.name, price: i.salePrice, quantity: i.quantity })),
        subtotal,
        discount: discountValue,
        total,
        paymentMethod,
        customerName: selectedCustomer?.name,
        notes: notes.trim() || undefined,
        createdAt: new Date(),
        company: companySettings,
      });

      toast.success("Venda registrada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products-pdv"] });
      navigate("/vendas");
    } catch (err: any) {
      toast.error("Erro ao registrar venda: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/vendas")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl">Nova Venda</h1>
            <p className="text-muted-foreground">Ponto de venda rápido</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left: Products + Customer */}
            <div className="lg:col-span-3 space-y-6">
              {/* Product Search */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Package className="h-5 w-5 text-primary" />
                    Produtos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar produto por nome, marca ou categoria..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {filteredProducts.length > 0 && (
                    <div className="rounded-lg border divide-y max-h-60 overflow-y-auto">
                      {filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          className="flex w-full items-center justify-between px-4 py-3 hover:bg-accent transition-colors text-left"
                          onClick={() => addToCart(product)}
                        >
                          <div>
                            <p className="font-medium text-sm">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {product.category} {product.brand_model ? `• ${product.brand_model}` : ""} • Estoque: {product.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-sm">
                              R$ {Number(product.sale_price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </span>
                            <Plus className="h-4 w-4 text-primary" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Cart Items */}
                  {cart.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Itens no carrinho</Label>
                        <div className="rounded-lg border divide-y">
                          {cart.map((item) => (
                            <div key={item.productId} className="flex items-center justify-between px-4 py-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{item.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  R$ {item.salePrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} un.
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateQuantity(item.productId, -1)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateQuantity(item.productId, 1)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <span className="w-20 text-right text-sm font-semibold">
                                  R$ {(item.salePrice * item.quantity).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => removeFromCart(item.productId)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {cart.length === 0 && productSearch.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <ShoppingCart className="h-10 w-10 text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">Busque e adicione produtos ao carrinho</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Customer */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5 text-primary" />
                    Cliente (opcional)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CustomerSearch selectedCustomer={selectedCustomer} onSelect={setSelectedCustomer} />
                </CardContent>
              </Card>
            </div>

            {/* Right: Summary */}
            <div className="lg:col-span-2">
              <Card className="lg:sticky lg:top-6">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Banknote className="h-5 w-5 text-primary" />
                    Resumo da Venda
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Payment Method */}
                  <div className="space-y-2">
                    <Label>Forma de Pagamento *</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map((pm) => (
                          <SelectItem key={pm.value} value={pm.value}>
                            <span className="flex items-center gap-2">
                              <pm.icon className="h-3.5 w-3.5" />
                              {pm.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Discount */}
                  <div className="space-y-2">
                    <Label htmlFor="discount">Desconto (R$)</Label>
                    <Input
                      id="discount"
                      type="number"
                      placeholder="0,00"
                      min="0"
                      step="0.01"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                    />
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="sale-notes">Observações</Label>
                    <Textarea
                      id="sale-notes"
                      placeholder="Observações da venda..."
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      maxLength={500}
                    />
                  </div>

                  <Separator />

                  {/* Totals */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal ({cart.reduce((a, i) => a + i.quantity, 0)} itens)</span>
                      <span>R$ {subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                    {discountValue > 0 && (
                      <div className="flex justify-between text-sm text-destructive">
                        <span>Desconto</span>
                        <span>- R$ {discountValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">
                        R$ {total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 pt-2">
                    <Button type="submit" disabled={saving || cart.length === 0} className="gap-2 w-full">
                      <Save className="h-4 w-4" />
                      {saving ? "Registrando..." : "Finalizar Venda"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => navigate("/vendas")} className="w-full">
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
