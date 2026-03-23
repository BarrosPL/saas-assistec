import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

const statusOptions: { value: OrderStatus; label: string }[] = [
  { value: "open", label: "Aberta" },
  { value: "diagnosis", label: "Diagnóstico" },
  { value: "waiting_parts", label: "Aguardando Peça" },
  { value: "repairing", label: "Em Reparo" },
  { value: "completed", label: "Concluída" },
  { value: "cancelled", label: "Cancelada" },
];

interface ChangeStatusDialogProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangeStatusDialog({ order, open, onOpenChange }: ChangeStatusDialogProps) {
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState<OrderStatus>(order.status);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (newStatus === order.status) {
      toast.info("Selecione um status diferente do atual.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("service_orders")
      .update({ status: newStatus })
      .eq("id", order.id);

    if (error) {
      toast.error("Erro ao alterar status: " + error.message);
    } else {
      // Insert history note if provided
      if (notes.trim()) {
        await supabase.from("service_order_history").insert({
          service_order_id: order.id,
          user_id: order.user_id,
          previous_status: order.status,
          new_status: newStatus,
          notes: notes.trim(),
        });
      }
      toast.success("Status alterado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["service-orders"] });
      onOpenChange(false);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar Status — OS-{String(order.order_number).padStart(3, "0")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Novo Status</Label>
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as OrderStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Textarea
              placeholder="Motivo da alteração..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
