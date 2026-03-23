import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface CancelOrderDialogProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CancelOrderDialog({ order, open, onOpenChange }: CancelOrderDialogProps) {
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const orderNum = `OS-${String(order.order_number).padStart(3, "0")}`;

  const handleCancel = async () => {
    setCancelling(true);
    const { error } = await supabase
      .from("service_orders")
      .update({ status: "cancelled" })
      .eq("id", order.id);

    if (error) {
      toast.error("Erro ao cancelar OS: " + error.message);
    } else {
      toast.success(`${orderNum} cancelada com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["service-orders"] });
      onOpenChange(false);
    }
    setCancelling(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar {orderNum}?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação irá alterar o status da ordem de serviço para "Cancelada". Essa ação não pode ser desfeita facilmente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={cancelling}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {cancelling ? "Cancelando..." : "Confirmar Cancelamento"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
