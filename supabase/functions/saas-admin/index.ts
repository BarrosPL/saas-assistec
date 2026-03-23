import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const reqData = await req.json()
    const { action, payload } = reqData

    // Autenticação para validar se quem chama a function é super_admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth header' }), { status: 401, headers: corsHeaders })
    }

    const JWTToken = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(JWTToken)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: corsHeaders })
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()

    if (profileError || !profile?.is_super_admin) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Not a super admin' }), { status: 403, headers: corsHeaders })
    }

    if (action === 'create_tenant') {
      const { email, password, fullName, companyName } = payload
      
      // Cria usuário com a chave service_role (Admin API)
      const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Já cria confirmado
      })

      if (createError) throw createError

      if (newUser.user) {
        // Atualiza profile com nome
        await supabaseClient.from('profiles').update({ full_name: fullName }).eq('id', newUser.user.id)
        
        // Atribui o role
        await supabaseClient.from('user_roles').insert({ user_id: newUser.user.id, role: 'owner' })
        
        // Cria a config inicial da empresa para esse tenant
        await supabaseClient.from('company_settings').insert({ user_id: newUser.user.id, company_name: companyName })
      }

      return new Response(JSON.stringify({ success: true, user: newUser.user }), { headers: corsHeaders })
    }

    if (action === 'toggle_status') {
      const { userId, isBanned } = payload
      
      const { data, error } = await supabaseClient.auth.admin.updateUserById(
        userId,
        { ban_duration: isBanned ? '87600h' : 'none' } // Bane por 10 anos ou desbane
      )

      if (error) throw error
      return new Response(JSON.stringify({ success: true, isBanned }), { headers: corsHeaders })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: corsHeaders })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})
