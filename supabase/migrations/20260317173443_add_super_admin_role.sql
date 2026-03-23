-- Adicionar coluna is_super_admin
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;

----------------------------------------------------
-- Função utilitária para verificar acesso (Evita recursão infinita no RLS)
----------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
    AND is_super_admin = true
  );
$$;

----------------------------------------------------
-- Garantir que RLS está ativo
----------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

----------------------------------------------------
-- Remover policies antigas caso existam
----------------------------------------------------

DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles access" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update" ON public.profiles;

DROP POLICY IF EXISTS "Super admin can view all sales" ON public.sales;
DROP POLICY IF EXISTS "Super admin can view all service_orders" ON public.service_orders;

DROP POLICY IF EXISTS "Super admin can view all company_settings" ON public.company_settings;
DROP POLICY IF EXISTS "Super admin can insert company_settings" ON public.company_settings;

DROP POLICY IF EXISTS "Super admin can view all user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admin can insert user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles access" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles insert" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

----------------------------------------------------
-- RECRIA AS POLICIES CORRETAMENTE USANDO A FUNÇÃO
----------------------------------------------------

-- Profiles
CREATE POLICY "Profiles access"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR public.is_super_admin()
);

CREATE POLICY "Profiles update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR public.is_super_admin()
);

CREATE POLICY "Profiles insert"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR public.is_super_admin()
);

-- Sales
CREATE POLICY "Sales access"
ON public.sales
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR public.is_super_admin()
);

-- Service orders
CREATE POLICY "Service orders access"
ON public.service_orders
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR public.is_super_admin()
);

-- Company settings
CREATE POLICY "Company settings access"
ON public.company_settings
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR public.is_super_admin()
);

CREATE POLICY "Company settings insert"
ON public.company_settings
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR public.is_super_admin()
);

-- User roles
CREATE POLICY "User roles access"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR public.is_super_admin()
);

CREATE POLICY "User roles insert"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR public.is_super_admin()
);