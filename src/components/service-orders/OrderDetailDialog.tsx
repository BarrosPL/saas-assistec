import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Smartphone, Wrench, Calendar, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

const statusConfig: Record<OrderStatus, { label: string; color: string }> = {
  open: { label: "Aberta", color: "bg-muted text-muted-foreground" },
  diagnosis: { label: "Diagnóstico", color: "bg-secondary text-secondary-foreground" },
  waiting_parts: { label: "Aguardando Peça", color: "bg-warning text-warning-foreground" },
  repairing: { label: "Em Reparo", color: "bg-primary text-primary-foreground" },
  completed: { label: "Concluída", color: "bg-success text-success-foreground" },
  cancelled: { label: "Cancelada", color: "bg-destructive text-destructive-foreground" },
};

const checklistLabels: Record<string, string> = {
  screen_ok: "Tela sem trincas/riscos",
  touch_ok: "Touch funcionando",
  buttons_ok: "Botões funcionando",
  camera_ok: "Câmera funcionando",
  speaker_ok: "Alto-falante funcionando",
  mic_ok: "Microfone funcionando",
  charging_ok: "Carregamento funcionando",
  battery_ok: "Bateria em bom estado",
  wifi_ok: "Wi-Fi funcionando",
  bluetooth_ok: "Bluetooth funcionando",
  biometric_ok: "Biometria funcionando",
  has_cover: "Possui capa/película",
};

interface OrderDetailDialogProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderDetailDialog({ order, open, onOpenChange }: OrderDetailDialogProps) {
  const orderNum = `OS-${String(order.order_number).padStart(3, "0")}`;
  const customerName = order.customers?.name || "Cliente não informado";
  const condition = (order.device_condition || {}) as Record<string, boolean>;

  const { data: history = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["order-history", order.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_order_history")
        .select("*")
        .eq("service_order_id", order.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {orderNum}
            <Badge className={statusConfig[order.status as OrderStatus]?.color}>
              {statusConfig[order.status as OrderStatus]?.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Cliente */}
            <section className="space-y-2">
              <h3 className="flex items-center gap-2 font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                <User className="h-4 w-4" /> Cliente
              </h3>
              <p className="font-medium">{customerName}</p>
            </section>

            <Separator />

            {/* Aparelho */}
            <section className="space-y-2">
              <h3 className="flex items-center gap-2 font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                <Smartphone className="h-4 w-4" /> Aparelho
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Marca:</span> {order.device_brand}</div>
                <div><span className="text-muted-foreground">Modelo:</span> {order.device_model}</div>
                {order.device_imei && (
                  <div className="col-span-2"><span className="text-muted-foreground">IMEI:</span> {order.device_imei}</div>
                )}
                <div>
                  <span className="text-muted-foreground">Ligando:</span>{" "}
                  {order.device_powered_on === true ? "Sim" : order.device_powered_on === false ? "Não" : "Não informado"}
                </div>
              </div>
            </section>

            {/* Checklist */}
            {Object.keys(condition).length > 0 && (
              <>
                <Separator />
                <section className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Checklist do Aparelho
                  </h3>
                  <div className="grid grid-cols-2 gap-1.5 text-sm">
                    {Object.entries(checklistLabels).map(([key, label]) => (
                      <div key={key} className="flex items-center gap-2">
                        {condition[key] ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                        )}
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            <Separator />

            {/* Serviço */}
            <section className="space-y-2">
              <h3 className="flex items-center gap-2 font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                <Wrench className="h-4 w-4" /> Serviço
              </h3>
              <div className="space-y-1 text-sm">
                <div><span className="text-muted-foreground">Defeito:</span> {order.reported_issue}</div>
                {order.technician && <div><span className="text-muted-foreground">Técnico:</span> {order.technician}</div>}
                <div>
                  <span className="text-muted-foreground">Valor:</span>{" "}
                  {order.service_value ? `R$ ${Number(order.service_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Prazo:</span>{" "}
                  {order.estimated_deadline ? format(new Date(order.estimated_deadline), "dd/MM/yyyy") : "—"}
                </div>
                {order.notes && <div><span className="text-muted-foreground">Observações:</span> {order.notes}</div>}
              </div>
            </section>

            <Separator />

            {/* Histórico */}
            <section className="space-y-2">
              <h3 className="flex items-center gap-2 font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                <Clock className="h-4 w-4" /> Histórico
              </h3>
              {loadingHistory ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma alteração de status registrada.</p>
              ) : (
                <div className="space-y-2">
                  {history.map((h) => (
                    <div key={h.id} className="flex items-start gap-3 text-sm rounded-lg bg-muted/50 p-2.5">
                      <Clock className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <p>
                          {h.previous_status
                            ? `${statusConfig[h.previous_status as OrderStatus]?.label} → ${statusConfig[h.new_status as OrderStatus]?.label}`
                            : statusConfig[h.new_status as OrderStatus]?.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(h.created_at), "dd/MM/yyyy 'às' HH:mm")}
                        </p>
                        {h.notes && <p className="text-xs mt-1">{h.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Entrega */}
            {order.device_received_at && (
              <>
                <Separator />
                <section className="space-y-2">
                  <h3 className="flex items-center gap-2 font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    <Calendar className="h-4 w-4" /> Entrega
                  </h3>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Data de recebimento:</span>{" "}
                    {format(new Date(order.device_received_at), "dd/MM/yyyy")}
                  </p>
                </section>
              </>
            )}

            {/* Assinaturas */}
            {(order.technician_signature || order.customer_signature) && (
              <>
                <Separator />
                <section className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Assinaturas
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {order.technician_signature && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Técnico</p>
                        <img src={order.technician_signature} alt="Assinatura do técnico" className="border rounded-md bg-background h-20 w-full object-contain" />
                      </div>
                    )}
                    {order.customer_signature && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Cliente</p>
                        <img src={order.customer_signature} alt="Assinatura do cliente" className="border rounded-md bg-background h-20 w-full object-contain" />
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}

            {/* Datas */}
            <Separator />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Criada em: {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm")}</p>
              <p>Atualizada em: {format(new Date(order.updated_at), "dd/MM/yyyy 'às' HH:mm")}</p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
