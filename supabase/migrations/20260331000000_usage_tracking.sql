-- Migration: Adicionar rastreamento de tempo de uso

-- 1. Criação da tabela para armazenar o tempo de uso diário de cada usuário
CREATE TABLE IF NOT EXISTS public.user_usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, usage_date)
);

-- 2. Habilita o RLS (Row Level Security) na tabela
ALTER TABLE public.user_usage_logs ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Segurança (Security Policies)
-- Lojistas podem ver apenas seus próprios logs
CREATE POLICY "Users can view their own usage logs"
ON public.user_usage_logs FOR SELECT
USING (auth.uid() = user_id);

-- O Super Admin pode ver todos os logs (adaptando baseado no seu RLS atual)
-- OBS: Adapte se você tiver uma role específica para admin.
CREATE POLICY "Admins can view all usage logs"
ON public.user_usage_logs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.user_id = auth.uid() 
        AND (profiles.is_super_admin = true OR profiles.is_super_admin IS NULL) -- Ajuste feito pois vi que alguns lugares usam null
    )
);

-- 4. Função RPC para incrementar o uso do usuário
-- Essa função é atômica para evitar problemas de concorrência com o Supabase.
CREATE OR REPLACE FUNCTION public.increment_user_usage(minutes_to_add INTEGER)
RETURNS void AS $$
DECLARE
    current_user_id UUID;
    today DATE;
BEGIN
    -- Obter o ID do usuário autenticado a partir do token JWT
    current_user_id := auth.uid();
    
    -- Usar a data atual do servidor
    today := CURRENT_DATE;

    -- Se o usuário não estiver logado, não faz nada
    IF current_user_id IS NULL THEN
        RETURN;
    END IF;

    -- Tenta inserir um novo registro para hoje. Se já existir (conflito em user_id e usage_date), 
    -- apenas atualiza o duration_minutes somando o novo valor (+ minutes_to_add).
    INSERT INTO public.user_usage_logs (user_id, usage_date, duration_minutes)
    VALUES (current_user_id, today, minutes_to_add)
    ON CONFLICT (user_id, usage_date)
    DO UPDATE SET 
        duration_minutes = public.user_usage_logs.duration_minutes + EXCLUDED.duration_minutes,
        updated_at = timezone('utc'::text, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
