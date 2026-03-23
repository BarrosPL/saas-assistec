import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;

interface StockMovementDialogProps {
  product: Product | null;
  type: "entry" | "exit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockMovementDialog({ product, type, open, onOpenChange }: StockMovementDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const isEntry = type === "entry";
  const title = isEntry ? "Entrada de Estoque" : "Saída de Estoque";

  const handleSubmit = async () => {
    if (!product || !user) return;
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      toast({ title: "Quantidade inválida", variant: "destructive" });
      return;
    }
    if (!isEntry && qty > product.quantity) {
      toast({ title: "Quantidade maior que o estoque disponível", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("stock_movements").insert({
      user_id: user.id,
      product_id: product.id,
      movement_type: type,
      quantity: qty,
      reason: reason.trim() || null,
    });

    setSaving(false);
    if (error) {
      toast({ title: "Erro ao registrar movimentação", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${isEntry ? "Entrada" : "Saída"} registrada!`, description: `${qty}x ${product.name}` });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onOpenChange(false);
      setQuantity("1");
      setReason("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {product && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <strong>{product.name}</strong> — Estoque atual: <strong>{product.quantity}</strong>
            </p>
            <div className="space-y-2">
              <Label>Quantidade *</Label>
              <Input
                type="number"
                min="1"
                max={!isEntry ? product.quantity : undefined}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Input
                placeholder={isEntry ? "Ex: Compra de fornecedor" : "Ex: Uso em reparo"}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={200}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Registrando..." : `Confirmar ${isEntry ? "Entrada" : "Saída"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
