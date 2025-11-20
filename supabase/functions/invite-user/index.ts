// Edge Function para enviar invitación a usuario (sin crear usuario)
// El usuario se creará cuando complete el formulario de registro
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
        JSON.stringify({ error: 'No tienes permisos para enviar invitaciones' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parsear el body de la petición
    const body = await req.json();
    const { email, alias } = body;

    // Validar campos requeridos
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email requerido' }),
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

    // Verificar si el usuario ya existe
    const { data: existingUser } = await adminClient.auth.admin.getUserByEmail(email);
    
    if (existingUser?.user) {
      return new Response(
        JSON.stringify({ error: 'Ya existe un usuario con este email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener la URL base para redirectTo (página de registro/sign-up)
    const redirectUrl = `${new URL(supabaseUrl).origin}/sign-up?email=${encodeURIComponent(email)}${alias ? `&alias=${encodeURIComponent(alias)}` : ''}`;

    // Enviar email de invitación usando signInWithOtp (magic link)
    // Esto enviará un email con un enlace que el usuario puede usar para registrarse
    const { error: inviteError } = await adminClient.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: redirectUrl,
        // Incluir el alias en los datos del email si está disponible
        data: alias ? { alias } : undefined,
      },
    });

    if (inviteError) {
      return new Response(
        JSON.stringify({ error: inviteError.message || 'Error al enviar invitación' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitación enviada correctamente. El usuario recibirá un email para completar su registro.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error en invite-user:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

