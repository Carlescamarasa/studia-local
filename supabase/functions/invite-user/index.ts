// Edge Function para enviar invitación a usuario
// Solo disponible para ADMIN

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Obtener origen permitido desde variable de entorno o usar fallback seguro
const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || 'https://studia.latrompetasonara.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
        JSON.stringify({ success: false, message: 'No se proporcionó token de autorización' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, message: 'Service role key no configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Crear cliente para verificar el usuario
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verificar que el usuario esté autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: 'Usuario no autenticado' }),
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
        JSON.stringify({ success: false, message: 'Solo administradores pueden enviar invitaciones' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parsear el body
    let { email, ...extra } = await req.json();

    // Normalizar email a lowercase
    if (email) {
      email = email.trim().toLowerCase();
    }

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, message: 'Email requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Crear cliente Admin con service_role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Intentar invitar al usuario
    // Helper centralizado para redirectTo - usar página de invitación
    const getInvitationRedirectUrl = () => {
      const baseUrl = new URL(supabaseUrl).origin;
      return `${baseUrl}/invitation`;
    };

    // Si el usuario ya existe, inviteUserByEmail puede fallar, pero eso está bien
    // porque significa que el usuario ya tiene cuenta
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      { 
        data: extra,
        redirectTo: getInvitationRedirectUrl(),
      }
    );

    if (error) {
      // Si el error es que el usuario ya existe, verificar su estado antes de reenviar invitación
      if (error.message?.includes('already registered') || 
          error.message?.includes('already exists') ||
          error.message?.includes('User already registered')) {
        // Verificar el estado del usuario antes de reenviar invitación
        try {
          const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(email);
          
          if (existingUser?.user) {
            const user = existingUser.user;
            // Verificar si el usuario ya tiene cuenta activa
            // email_confirmed_at se establece cuando el usuario confirma su email (al establecer contraseña)
            const hasConfirmedEmail = !!user.email_confirmed_at;
            
            if (hasConfirmedEmail) {
              // Usuario ya tiene cuenta activa, no reenviar invitación
              return new Response(
                JSON.stringify({ 
                  success: false, 
                  message: 'El usuario ya existe y tiene una cuenta activa. No se puede reenviar la invitación.' 
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
            
            // Usuario existe pero no tiene cuenta activa, generar link de invitación
            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
              type: 'invite',
              email: email,
              options: {
                redirectTo: getInvitationRedirectUrl(),
              },
            });

            if (linkError) {
              return new Response(
                JSON.stringify({ 
                  success: false, 
                  message: `Error al generar link de invitación: ${linkError.message}` 
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }

            return new Response(
              JSON.stringify({ 
                success: true, 
                message: 'Invitación reenviada al usuario existente',
                user: linkData 
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else {
            // Usuario no encontrado a pesar del error
            return new Response(
              JSON.stringify({ 
                success: false, 
                message: 'Error al verificar el estado del usuario' 
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (linkErr) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: `Error al verificar usuario: ${linkErr.message || linkErr}` 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Otro tipo de error
      return new Response(
        JSON.stringify({ success: false, message: error.message || 'Error al enviar invitación' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, user: data, message: 'Invitación enviada correctamente' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({
        success: false,
        message: e.message || 'Error interno en invite-user',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

