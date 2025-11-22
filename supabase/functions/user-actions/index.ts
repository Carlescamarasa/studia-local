// Edge Function para acciones de usuario (magic link, reset password, resend invitation)
// Esta función debe ser llamada solo por usuarios autenticados con rol ADMIN o PROF

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

    // Verificar que el usuario esté autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuario no autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar que el usuario sea ADMIN o PROF
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || (profile.role !== 'ADMIN' && profile.role !== 'PROF')) {
      return new Response(
        JSON.stringify({ error: 'No tienes permisos para realizar esta acción' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parsear el body de la petición
    const body = await req.json();
    const { action, userId, email } = body;

    // Validar campos requeridos
    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Acción requerida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userId && !email) {
      return new Response(
        JSON.stringify({ error: 'userId o email requerido' }),
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

    // Obtener el usuario objetivo
    let targetUser;
    if (userId) {
      const { data, error } = await adminClient.auth.admin.getUserById(userId);
      if (error || !data?.user) {
        return new Response(
          JSON.stringify({ error: 'Usuario no encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      targetUser = data.user;
    } else if (email) {
      // No usar getUserByEmail (no existe en v2)
      // Buscar en profiles por email o usar listUsers con filtro
      const { data: profiles, error: profileError } = await adminClient
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .maybeSingle();
      
      if (profileError || !profiles) {
        return new Response(
          JSON.stringify({ error: 'Usuario no encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Obtener el usuario de auth por ID del perfil
      const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(profiles.id);
      if (userError || !userData?.user) {
        return new Response(
          JSON.stringify({ error: 'Usuario no encontrado en auth' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      targetUser = userData.user;
    }

    if (!targetUser || !targetUser.email) {
      return new Response(
        JSON.stringify({ error: 'Usuario no encontrado o sin email' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar permisos: PROF solo puede actuar sobre sus estudiantes
    if (profile.role === 'PROF') {
      const { data: targetProfile } = await adminClient
        .from('profiles')
        .select('profesor_asignado_id')
        .eq('id', targetUser.id)
        .single();

      if (!targetProfile || targetProfile.profesor_asignado_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Solo puedes realizar acciones sobre tus estudiantes' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Obtener la URL base para redirectTo
    const redirectUrl = `${new URL(supabaseUrl).origin}/reset-password`;
    let result;
    let error;

    // Ejecutar la acción solicitada
    switch (action) {
      case 'magic_link':
        // Enviar enlace mágico (OTP)
        // Usar signInWithOtp del cliente normal con service role (envía email automáticamente)
        const { error: magicLinkError } = await adminClient.auth.signInWithOtp({
          email: targetUser.email!,
          options: {
            emailRedirectTo: redirectUrl,
          },
        });
        if (magicLinkError) {
          error = magicLinkError;
        }
        break;

      case 'reset_password':
        // Enviar email de recuperación de contraseña
        // Usar el cliente normal con service role para resetPasswordForEmail (envía email automáticamente)
        const { error: resetError } = await adminClient.auth.resetPasswordForEmail(targetUser.email!, {
          redirectTo: redirectUrl,
        });
        if (resetError) {
          error = resetError;
        }
        break;

      case 'resend_invitation':
        // Reenviar invitación
        result = await adminClient.auth.admin.generateLink({
          type: 'invite',
          email: targetUser.email!,
          options: {
            redirectTo: redirectUrl,
          },
        });
        if (result.error) {
          error = result.error;
        }
        break;

      default:
        return new Response(
          JSON.stringify({ error: 'Acción no válida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message || 'Error al ejecutar la acción' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const actionMessages = {
      magic_link: 'Enlace mágico enviado correctamente',
      reset_password: 'Email de recuperación de contraseña enviado correctamente',
      resend_invitation: 'Invitación reenviada correctamente',
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: actionMessages[action as keyof typeof actionMessages] || 'Acción ejecutada correctamente',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error en user-actions:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

