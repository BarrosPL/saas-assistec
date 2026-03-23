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

interface DeleteOrderDialogProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteOrderDialog({ order, open, onOpenChange }: DeleteOrderDialogProps) {
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const orderNum = `OS-${String(order.order_number).padStart(3, "0")}`;

  const handleDelete = async () => {
    setDeleting(true);

    try {
      // Deletar o histórico primeiro para evitar erro de Foreign Key
      const { error: historyError } = await supabase
        .from("service_order_history")
        .delete()
        .eq("service_order_id", order.id);

      if (historyError) {
        console.error("Erro ao excluir histórico da OS:", historyError);
        // Continuamos de qualquer forma, pois o Supabase pode já ter CASCADE configurado,
        // ou o erro será capturado no próximo passo.
      }

      const { error } = await supabase
        .from("service_orders")
        .delete()
        .eq("id", order.id);

      if (error) {
        // Se houver erro de constraint de transações financeiras/estoque, será exibido aqui
        if (error.message.includes("foreign key constraint") || error.code === "23503") {
          toast.error("Não é possível excluir a OS, pois ela possui transações financeiras ou de estoque vinculadas. Cancele a OS em vez de excluí-la.");
        } else {
          toast.error("Erro ao excluir OS: " + error.message);
        }
      } else {
        toast.success(`${orderNum} excluída com sucesso!`);
        queryClient.invalidateQueries({ queryKey: ["service-orders"] });
        onOpenChange(false);
      }
    } catch (err: any) {
      toast.error("Erro ao excluir OS");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir {orderNum}?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir esta ordem de serviço? Esta ação é permanente e não poderá ser desfeita. Todos os dados serão perdidos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? "Excluindo..." : "Confirmar Exclusão"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
