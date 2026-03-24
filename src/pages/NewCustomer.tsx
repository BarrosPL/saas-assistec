import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, UserPlus, Phone, Mail, CreditCard } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const customerSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  phone: z.string().trim().min(10, "WhatsApp deve ter pelo menos 10 dígitos").max(20),
  email: z.string().trim().email("E-mail inválido").max(255).or(z.literal("")).optional(),
  cpf: z.string().trim().max(14).optional(),
  notes: z.string().trim().max(500).optional(),
});

type CustomerForm = z.infer<typeof customerSchema>;

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCPF(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export default function NewCustomer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "", phone: "", email: "", cpf: "", notes: "" },
  });

  const onSubmit = async (data: CustomerForm) => {
    if (!user) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("customers").insert({
        user_id: user.id,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        cpf: data.cpf || null,
        notes: data.notes || null,
      });

      if (error) throw error;

      toast.success("Cliente cadastrado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      navigate("/clientes");
    } catch (err: any) {
      toast.error("Erro ao cadastrar cliente: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold lg:text-3xl">Novo Cliente</h1>
            <p className="text-muted-foreground">Cadastre um novo cliente</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Info Principal */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <UserPlus className="h-5 w-5 text-primary" />
              Informações do Cliente
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome completo *</Label>
              <Input id="name" placeholder="Ex: João da Silva" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> WhatsApp *
              </Label>
              <Input
                id="phone"
                placeholder="(00) 00000-0000"
                value={watch("phone")}
                onChange={(e) => setValue("phone", formatPhone(e.target.value), { shouldValidate: true })}
              />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>
          </div>

          {/* Info Opcional */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="text-lg font-semibold">Informações Opcionais</div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> E-mail
              </Label>
              <Input id="email" type="email" placeholder="cliente@email.com" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf" className="flex items-center gap-1">
                <CreditCard className="h-3.5 w-3.5" /> CPF
              </Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                value={watch("cpf")}
                onChange={(e) => setValue("cpf", formatCPF(e.target.value), { shouldValidate: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Informações adicionais sobre o cliente..."
                rows={3}
                {...register("notes")}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              <Save className="h-4 w-4" />
              {isSubmitting ? "Salvando..." : "Salvar Cliente"}
            </Button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
