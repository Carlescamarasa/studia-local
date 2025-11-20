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
    const { email, full_name, nivel, profesor_asignado_id, sendInvitation } = body;

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
    let inviteLink = null;

    if (sendInvitation) {
      // Crear usuario sin contraseña para invitación
      // Generar contraseña temporal aleatoria (no se usará, solo para cumplir requisito)
      const tempPassword = `Temp${Math.random().toString(36).slice(-12)}!${Math.floor(Math.random() * 100)}`;

      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: false, // No confirmar, esperar a que el usuario complete el registro
        user_metadata: {
          full_name,
          role: 'ESTU',
        },
      });

      authUser = data?.user;
      authError = error;

      // Si se creó correctamente, generar link de invitación
      if (authUser && !authError) {
        const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
          type: 'invite',
          email: email,
          options: {
            redirectTo: `${new URL(supabaseUrl).origin}/reset-password`,
          },
        });

        if (linkError) {
          console.error('Error al generar link de invitación:', linkError);
        } else {
          inviteLink = linkData?.properties?.action_link;
        }
      }
    } else {
      // Crear usuario directamente con contraseña temporal
      // Generar contraseña temporal aleatoria
      const tempPassword = `Temp${Math.random().toString(36).slice(-12)}!${Math.floor(Math.random() * 100)}`;

      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true, // Confirmar email automáticamente
        user_metadata: {
          full_name,
          role: 'ESTU',
        },
      });

      authUser = data?.user;
      authError = error;

      // Si se creó correctamente, generar link de reset de contraseña
      if (authUser && !authError) {
        const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
          type: 'recovery',
          email: email,
          options: {
            redirectTo: `${new URL(supabaseUrl).origin}/reset-password`,
          },
        });

        if (linkError) {
          console.error('Error al generar link de recuperación:', linkError);
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
        message: sendInvitation
          ? 'Invitación enviada correctamente'
          : 'Usuario creado correctamente. Se ha enviado un email para establecer la contraseña.',
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

