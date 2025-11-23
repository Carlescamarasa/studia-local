// Edge Function para obtener emails de usuarios desde auth.users
// Disponible para ADMIN (todos los usuarios) y PROF (solo alumnos asignados con tickets)

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

    if (profileError) {
      console.error('Error al leer perfil:', profileError);
      return new Response(
        JSON.stringify({ 
          error: 'Error al verificar permisos',
          details: profileError.message 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Perfil no encontrado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalizar el rol (trim y uppercase) para comparación
    const userRole = profile.role ? String(profile.role).trim().toUpperCase() : '';
    
    // Parsear el body de la petición
    const body = await req.json();
    const { userIds } = body;

    // Si es PROF, verificar que los userIds solicitados sean alumnos asignados
    if (userRole === 'PROF') {
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return new Response(
          JSON.stringify({ error: 'userIds debe ser un array no vacío' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Obtener alumnos asignados a este profesor
      const { data: alumnos, error: alumnosError } = await supabase
        .from('profiles')
        .select('id')
        .eq('profesor_asignado_id', user.id)
        .eq('role', 'ESTU')
        .in('id', userIds);

      if (alumnosError) {
        console.error('Error al verificar alumnos asignados:', alumnosError);
        return new Response(
          JSON.stringify({ 
            error: 'Error al verificar alumnos asignados',
            details: alumnosError.message 
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const alumnoIds = new Set(alumnos?.map(a => a.id) || []);

      // Filtrar userIds: solo permitir aquellos que son alumnos asignados
      const filteredUserIds = userIds.filter(id => alumnoIds.has(id));
      
      if (filteredUserIds.length === 0) {
        return new Response(
          JSON.stringify({ 
            error: 'No tienes permisos para obtener emails de estos usuarios. Solo puedes obtener emails de tus alumnos asignados.',
            role: userRole 
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (filteredUserIds.length !== userIds.length) {
        console.warn('Algunos userIds fueron filtrados:', {
          original: userIds,
          filtered: filteredUserIds,
        });
      }
      
      // Reemplazar userIds con los filtrados
      userIds.length = 0;
      userIds.push(...filteredUserIds);
    } else if (userRole !== 'ADMIN') {
      console.error('Usuario no es ADMIN ni PROF. Rol actual:', userRole, 'User ID:', user.id);
      return new Response(
        JSON.stringify({ 
          error: 'Solo administradores y profesores pueden obtener emails de usuarios',
          role: userRole 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'userIds debe ser un array no vacío' }),
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

    // Obtener emails de usuarios usando getUserById para cada usuario
    // Esto es más eficiente que listar todos los usuarios
    const emailMap: Record<string, string> = {};

    // Procesar usuarios en paralelo (máximo 10 a la vez para no sobrecargar)
    const batchSize = 10;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      // Obtener usuarios en paralelo
      const promises = batch.map(async (userId: string) => {
        try {
          const { data, error } = await adminClient.auth.admin.getUserById(userId);
          if (!error && data?.user?.email) {
            return { userId, email: data.user.email };
          }
          return null;
        } catch (e) {
          console.error(`Error al obtener usuario ${userId}:`, e);
          return null;
        }
      });

      const results = await Promise.all(promises);
      for (const result of results) {
        if (result) {
          emailMap[result.userId] = result.email;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emails: emailMap,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error en get-user-emails:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

