// Edge Function para eliminar usuarios
// Esta función debe ser llamada solo por usuarios autenticados con rol ADMIN

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Obtener origen permitido desde variable de entorno o usar fallback seguro
// Permitir tanto producción como desarrollo (localhost)
const getAllowedOrigin = (requestOrigin: string | null) => {
  const envOrigin = Deno.env.get('ALLOWED_ORIGIN');
  const allowedOrigins = [
    envOrigin || 'https://studia.latrompetasonara.com',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5174',
  ];
  
  // Si el origen de la petición está en la lista permitida, usarlo
  if (requestOrigin) {
    // Verificar coincidencia exacta
    if (allowedOrigins.includes(requestOrigin)) {
      return requestOrigin;
    }
    // Verificar si es localhost con cualquier puerto (para desarrollo)
    if (requestOrigin.startsWith('http://localhost:') || requestOrigin.startsWith('http://127.0.0.1:')) {
      return requestOrigin;
    }
  }
  
  // Por defecto, usar el origen de producción
  return allowedOrigins[0];
};

const getCorsHeaders = (requestOrigin: string | null) => {
  const allowedOrigin = getAllowedOrigin(requestOrigin);
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};

serve(async (req) => {
  // Obtener el origen de la petición
  const requestOrigin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(requestOrigin);
  
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

    // Verificar que el usuario sea ADMIN
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'No se pudo verificar el rol del usuario' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userRole = profile.role ? String(profile.role).trim().toUpperCase() : '';
    if (userRole !== 'ADMIN') {
      return new Response(
        JSON.stringify({ error: 'Solo los administradores pueden eliminar usuarios' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener el userId del body
    const { userId } = await req.json();
    if (!userId || typeof userId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'userId es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No permitir que un usuario se elimine a sí mismo
    if (userId === user.id) {
      return new Response(
        JSON.stringify({ error: 'No puedes eliminar tu propia cuenta' }),
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

    // 1. Eliminar el usuario de auth.users usando Admin API
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteAuthError) {
      console.error('Error al eliminar usuario de auth.users:', deleteAuthError);
      return new Response(
        JSON.stringify({ error: `Error al eliminar usuario: ${deleteAuthError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Eliminar el perfil de la tabla profiles
    // Nota: En Supabase, cuando se elimina un usuario de auth.users, 
    // normalmente se elimina automáticamente el perfil si hay un trigger ON DELETE CASCADE.
    // Pero lo hacemos explícitamente por si acaso no está configurado.
    const { error: deleteProfileError } = await adminClient
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (deleteProfileError) {
      console.error('Error al eliminar perfil de profiles:', deleteProfileError);
      // No devolvemos error aquí porque el usuario ya fue eliminado de auth.users
      // Solo registramos el error
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Usuario eliminado correctamente'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error en delete-user:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

