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
import { ArrowLeft, Save, Wrench, Smartphone, FileText } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DeviceChecklist } from "@/components/service-orders/DeviceChecklist";
import { CustomerSearch } from "@/components/service-orders/CustomerSearch";
import { SignatureCanvas } from "@/components/service-orders/SignatureCanvas";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const formSchema = z.object({
  deviceBrand: z.string().min(1, "Marca é obrigatória").max(100),
  deviceModel: z.string().min(1, "Modelo é obrigatório").max(100),
  deviceImei: z.string().max(20).optional(),
  devicePoweredOn: z.boolean({
    required_error: "Indique se o aparelho está ligando",
    invalid_type_error: "Indique se o aparelho está ligando",
  }),
  reportedIssue: z.string().min(3, "Descreva o defeito relatado").max(1000),
  technician: z.string().max(100).optional(),
  serviceValue: z.number().min(0).optional(),
  estimatedDeadline: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

const popularBrands = [
  "Apple", "Samsung", "Motorola", "Xiaomi", "LG", "Huawei", "Nokia", "Realme", "ASUS", "Outro",
];

export default function NewServiceOrder() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string; name: string; phone: string; email: string | null; cpf: string | null;
  } | null>(null);
  const [deviceBrand, setDeviceBrand] = useState("");
  const [deviceModel, setDeviceModel] = useState("");
  const [deviceImei, setDeviceImei] = useState("");
  const [reportedIssue, setReportedIssue] = useState("");
  const [technician, setTechnician] = useState("");
  const [serviceValue, setServiceValue] = useState("");
  const [estimatedDeadline, setEstimatedDeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [deviceCondition, setDeviceCondition] = useState<Record<string, boolean>>({});
  const [devicePoweredOn, setDevicePoweredOn] = useState<boolean | null>(null);
  const [technicianSignature, setTechnicianSignature] = useState<string | null>(null);
  const [customerSignature, setCustomerSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const parsed = formSchema.safeParse({
      deviceBrand,
      deviceModel,
      deviceImei: deviceImei || undefined,
      devicePoweredOn,
      reportedIssue,
      technician: technician || undefined,
      serviceValue: serviceValue ? parseFloat(serviceValue) : undefined,
      estimatedDeadline: estimatedDeadline || undefined,
      notes: notes || undefined,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSaving(true);

    const { error } = await supabase.from("service_orders").insert({
      user_id: user.id,
      customer_id: selectedCustomer?.id || null,
      device_brand: deviceBrand.trim(),
      device_model: deviceModel.trim(),
      device_imei: deviceImei.trim() || null,
      reported_issue: reportedIssue.trim(),
      technician: technician.trim() || null,
      service_value: serviceValue ? parseFloat(serviceValue) : 0,
      estimated_deadline: estimatedDeadline || null,
      notes: notes.trim() || null,
      device_condition: deviceCondition,
      device_powered_on: devicePoweredOn,
      technician_signature: technicianSignature,
      customer_signature: customerSignature,
    });

    setSaving(false);

    if (error) {
      toast({
        title: "Erro ao criar OS",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "OS criada com sucesso!", description: "A ordem de serviço foi registrada." });
    navigate("/ordens");
  };

  return (
    <MainLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/ordens")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl">Nova Ordem de Serviço</h1>
            <p className="text-muted-foreground">Preencha os dados do aparelho e do serviço</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerSearch
                selectedCustomer={selectedCustomer}
                onSelect={setSelectedCustomer}
              />
            </CardContent>
          </Card>

          {/* Device Info */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Smartphone className="h-5 w-5 text-primary" />
                Dados do Aparelho
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brand">Marca *</Label>
                  <Select value={deviceBrand} onValueChange={setDeviceBrand}>
                    <SelectTrigger className={errors.deviceBrand ? "border-destructive" : ""}>
                      <SelectValue placeholder="Selecione a marca" />
                    </SelectTrigger>
                    <SelectContent>
                      {popularBrands.map((brand) => (
                        <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.deviceBrand && (
                    <p className="text-sm text-destructive">{errors.deviceBrand}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Modelo *</Label>
                  <Input
                    id="model"
                    placeholder="Ex: iPhone 14, Galaxy S23..."
                    value={deviceModel}
                    onChange={(e) => setDeviceModel(e.target.value)}
                    maxLength={100}
                    className={errors.deviceModel ? "border-destructive" : ""}
                  />
                  {errors.deviceModel && (
                    <p className="text-sm text-destructive">{errors.deviceModel}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>IMEI (opcional)</Label>
                <Input
                  id="imei"
                  placeholder="Número IMEI do aparelho"
                  value={deviceImei}
                  onChange={(e) => setDeviceImei(e.target.value)}
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <Label>Aparelho Ligando? *</Label>
                <RadioGroup
                  value={devicePoweredOn === null ? "" : devicePoweredOn.toString()}
                  onValueChange={(value) => setDevicePoweredOn(value === "true")}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="powered-yes" />
                    <Label htmlFor="powered-yes" className="cursor-pointer">Sim</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="powered-no" />
                    <Label htmlFor="powered-no" className="cursor-pointer">Não</Label>
                  </div>
                </RadioGroup>
                {errors.devicePoweredOn && (
                  <p className="text-sm text-destructive">{errors.devicePoweredOn}</p>
                )}
              </div>

              <Separator />

              <DeviceChecklist condition={deviceCondition} onChange={setDeviceCondition} />
            </CardContent>
          </Card>

          {/* Service Info */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wrench className="h-5 w-5 text-primary" />
                Dados do Serviço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="issue">Defeito Relatado *</Label>
                <Textarea
                  id="issue"
                  placeholder="Descreva o problema relatado pelo cliente..."
                  value={reportedIssue}
                  onChange={(e) => setReportedIssue(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  className={errors.reportedIssue ? "border-destructive" : ""}
                />
                {errors.reportedIssue && (
                  <p className="text-sm text-destructive">{errors.reportedIssue}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="technician">Técnico</Label>
                  <Input
                    id="technician"
                    placeholder="Nome do técnico"
                    value={technician}
                    onChange={(e) => setTechnician(e.target.value)}
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value">Valor do Serviço (R$)</Label>
                  <Input
                    id="value"
                    type="number"
                    placeholder="0,00"
                    min="0"
                    step="0.01"
                    value={serviceValue}
                    onChange={(e) => setServiceValue(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">Prazo Estimado</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={estimatedDeadline}
                    onChange={(e) => setEstimatedDeadline(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  placeholder="Observações adicionais sobre o serviço..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={2000}
                  rows={3}
                />
              </div>

              <Separator />

              {/* Signatures */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SignatureCanvas
                  label="Assinatura do Técnico"
                  value={technicianSignature}
                  onChange={setTechnicianSignature}
                />
                <SignatureCanvas
                  label="Assinatura do Cliente"
                  value={customerSignature}
                  onChange={setCustomerSignature}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/ordens")}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : "Criar Ordem de Serviço"}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
