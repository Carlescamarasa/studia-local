// Edge Function para crear usuarios usando Admin API
// Esta función debe ser llamada solo por usuarios autenticados con rol ADMIN

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Obtener el token de autorización del header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No se proporcionó token de autorización' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Crear cliente con anon key para verificar el usuario
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Service role key no configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verificar que el usuario esté autenticado y sea ADMIN
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuario no autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar que el usuario sea ADMIN
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'ADMIN') {
      return new Response(
        JSON.stringify({ error: 'No tienes permisos para crear usuarios' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parsear el body de la petición
    const body = await req.json();
    const { email, full_name, nivel, profesor_asignado_id } = body;

    // Validar campos requeridos
    if (!email || !full_name) {
      return new Response(
        JSON.stringify({ error: 'Email y nombre completo son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Crear cliente Admin con service_role key
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    let authUser;
    let authError;

    // Obtener la URL base para redirectTo (página de reset password)
    const redirectUrl = `${new URL(supabaseUrl).origin}/reset-password`;

    // Siempre usar modo invitación: inviteUserByEmail() crea el usuario Y envía el email automáticamente
    // El email será una invitación para que el usuario establezca su contraseña
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name,
        role: 'ESTU',
      },
      redirectTo: redirectUrl,
    });

    authUser = data?.user;
    authError = error;

    if (authError) {
      // Si el usuario ya existe, intentar obtenerlo
      if (authError.message?.includes('already registered') || authError.message?.includes('already exists')) {
        const { data: existingUser } = await adminClient.auth.admin.getUserByEmail(email);
        if (existingUser?.user) {
          authUser = existingUser.user;
          authError = null;
          // Reenviar invitación al usuario existente
          await adminClient.auth.admin.generateLink({
            type: 'invite',
            email: email,
            options: {
              redirectTo: redirectUrl,
            },
          });
        }
      }
    }

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message || 'Error al crear usuario' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authUser) {
      return new Response(
        JSON.stringify({ error: 'No se pudo crear el usuario' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Actualizar el perfil con nivel y profesor asignado
    const profileUpdates: any = {
      full_name,
      nivel: nivel || null,
      profesor_asignado_id: profesor_asignado_id || null,
    };

    const { error: updateError } = await adminClient
      .from('profiles')
      .update(profileUpdates)
      .eq('id', authUser.id);

    if (updateError) {
      console.error('Error al actualizar perfil:', updateError);
      // No fallar si el perfil ya existe (el trigger lo creó)
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: authUser.id,
          email: authUser.email,
          full_name,
          nivel,
          profesor_asignado_id,
        },
        message: 'Usuario creado e invitación enviada correctamente. El usuario recibirá un email para establecer su contraseña.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error en create-user:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

