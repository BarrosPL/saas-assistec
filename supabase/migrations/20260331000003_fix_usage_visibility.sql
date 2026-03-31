-- 1. Garantir que o usuário administrador atual é de fato um Super Admin
-- Você deve rodar isso no editor SQL do Supabase. Se houver erro de permissão, 
-- use o usuário 'postgres' (que já é automático no editor do Supabase).

UPDATE public.profiles 
SET is_super_admin = true 
WHERE user_id = auth.uid(); -- Define o usuário que está rodando este script como super admin.

-- 2. Corrigir a política de acesso à tabela profiles
-- Queremos garantir que o Super Admin sempre veja TODOS os perfis, independente de outros filtros.
DROP POLICY IF EXISTS "Profiles access" ON public.profiles;
CREATE POLICY "Profiles access"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR (SELECT is_super_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true
);

-- 3. Corrigir a política de acesso aos logs de tempo de uso
-- Simplificar a checagem de admin para ser mais robusta.
DROP POLICY IF EXISTS "Admins can view all usage logs" ON public.user_usage_logs;
CREATE POLICY "Admins can view all usage logs"
ON public.user_usage_logs FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.is_super_admin = true
    )
);

-- 4. Garantir que o Super Admin pode VER a si mesmo e outros no ranking
-- Às vezes o filtro de Super Admin exclui o próprio admin do Ranking, o que é OK se o admin não quiser se ver, 
-- mas precisamos garantir que o Admin consiga ver os outros lojistas.

-- 5. Caso o trigger de criação automática de perfil tenha falhado em algum registro antigo
-- Este comando tenta criar perfis para usuários que existem no Auth mas não no Public.Profiles
INSERT INTO public.profiles (user_id, full_name, email)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', 'Usuário'), email
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles)
ON CONFLICT (user_id) DO NOTHING;
