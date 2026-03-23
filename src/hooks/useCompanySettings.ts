import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CompanySettings {
  id?: string;
  user_id: string;
  company_name: string | null;
  cnpj: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  logo_url: string | null;
}

export function useCompanySettings() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["company_settings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as CompanySettings | null;
    },
  });

  return query;
}

export function useSaveCompanySettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<CompanySettings>) => {
      const { data: existing } = await supabase
        .from("company_settings")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("company_settings")
          .update(settings)
          .eq("user_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("company_settings")
          .insert({ ...settings, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company_settings"] });
      toast.success("Configurações salvas com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar: " + err.message);
    },
  });
}

export function useUploadLogo() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split(".").pop();
      const path = `${user!.id}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("logos")
        .getPublicUrl(path);

      // Save URL with cache-bust
      const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const { data: existing } = await supabase
        .from("company_settings")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("company_settings")
          .update({ logo_url: logoUrl })
          .eq("user_id", user!.id);
      } else {
        await supabase
          .from("company_settings")
          .insert({ user_id: user!.id, logo_url: logoUrl });
      }

      return logoUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company_settings"] });
      toast.success("Logotipo atualizado!");
    },
    onError: (err: any) => {
      toast.error("Erro ao enviar logo: " + err.message);
    },
  });
}
