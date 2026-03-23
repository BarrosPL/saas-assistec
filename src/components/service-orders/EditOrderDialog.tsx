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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { DeviceChecklist } from "./DeviceChecklist";
import { SignatureCanvas } from "./SignatureCanvas";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const popularBrands = [
  "Apple", "Samsung", "Motorola", "Xiaomi", "LG", "Huawei", "Nokia", "Realme", "ASUS", "Outro",
];

interface EditOrderDialogProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditOrderDialog({ order, open, onOpenChange }: EditOrderDialogProps) {
  const queryClient = useQueryClient();
  const [deviceBrand, setDeviceBrand] = useState(order.device_brand);
  const [deviceModel, setDeviceModel] = useState(order.device_model);
  const [deviceImei, setDeviceImei] = useState(order.device_imei || "");
  const [reportedIssue, setReportedIssue] = useState(order.reported_issue);
  const [technician, setTechnician] = useState(order.technician || "");
  const [serviceValue, setServiceValue] = useState(order.service_value?.toString() || "");
  const [estimatedDeadline, setEstimatedDeadline] = useState(order.estimated_deadline || "");
  const [notes, setNotes] = useState(order.notes || "");
  const [deviceCondition, setDeviceCondition] = useState<Record<string, boolean>>(
    (order.device_condition as Record<string, boolean>) || {}
  );
  const [technicianSignature, setTechnicianSignature] = useState<string | null>(order.technician_signature || null);
  const [customerSignature, setCustomerSignature] = useState<string | null>(order.customer_signature || null);
  const [deviceReceivedAt, setDeviceReceivedAt] = useState(order.device_received_at || "");
  const [devicePoweredOn, setDevicePoweredOn] = useState<boolean | null>(order.device_powered_on ?? null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!deviceBrand.trim() || !deviceModel.trim() || !reportedIssue.trim()) {
      toast.error("Preencha os campos obrigatórios: Marca, Modelo e Defeito.");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("service_orders")
      .update({
        device_brand: deviceBrand.trim(),
        device_model: deviceModel.trim(),
        device_imei: deviceImei.trim() || null,
        reported_issue: reportedIssue.trim(),
        technician: technician.trim() || null,
        service_value: serviceValue ? parseFloat(serviceValue) : 0,
        estimated_deadline: estimatedDeadline || null,
        notes: notes.trim() || null,
        device_condition: deviceCondition,
        technician_signature: technicianSignature || null,
        customer_signature: customerSignature || null,
        device_received_at: deviceReceivedAt || null,
        device_powered_on: devicePoweredOn,
      })
      .eq("id", order.id);

    if (error) {
      toast.error("Erro ao atualizar OS: " + error.message);
    } else {
      toast.success("OS atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["service-orders"] });
      onOpenChange(false);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Editar OS-{String(order.order_number).padStart(3, "0")}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Marca *</Label>
                <Select value={deviceBrand} onValueChange={setDeviceBrand}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {popularBrands.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Modelo *</Label>
                <Input value={deviceModel} onChange={(e) => setDeviceModel(e.target.value)} maxLength={100} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>IMEI</Label>
              <Input value={deviceImei} onChange={(e) => setDeviceImei(e.target.value)} maxLength={20} />
            </div>
            <div className="space-y-2">
              <Label>Aparelho Ligando?</Label>
              <RadioGroup
                value={devicePoweredOn === null ? "" : devicePoweredOn.toString()}
                onValueChange={(value) => setDevicePoweredOn(value === "true")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="edit-powered-yes" />
                  <Label htmlFor="edit-powered-yes" className="cursor-pointer">Sim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="edit-powered-no" />
                  <Label htmlFor="edit-powered-no" className="cursor-pointer">Não</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label>Defeito Relatado *</Label>
              <Textarea value={reportedIssue} onChange={(e) => setReportedIssue(e.target.value)} rows={3} maxLength={1000} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Técnico</Label>
                <Input value={technician} onChange={(e) => setTechnician(e.target.value)} maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input type="number" min="0" step="0.01" value={serviceValue} onChange={(e) => setServiceValue(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Prazo</Label>
                <Input type="date" value={estimatedDeadline} onChange={(e) => setEstimatedDeadline(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={2000} />
            </div>
            <DeviceChecklist condition={deviceCondition} onChange={setDeviceCondition} />
            <div className="space-y-2">
              <Label>Data de Recebimento do Aparelho</Label>
              <Input type="date" value={deviceReceivedAt} onChange={(e) => setDeviceReceivedAt(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SignatureCanvas label="Assinatura do Técnico" value={technicianSignature} onChange={setTechnicianSignature} />
              <SignatureCanvas label="Assinatura do Cliente" value={customerSignature} onChange={setCustomerSignature} />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
