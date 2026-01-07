// Edge Function para obtener emails de usuarios desde auth.users
// Disponible para:
// - ADMIN: todos los usuarios
// - PROF: solo alumnos asignados
// - ESTU: solo su profesor asignado

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

    console.log('Usuario autenticado:', {
      userId: user.id,
      role: profile.role,
      normalizedRole: userRole,
    });

    // Parsear el body de la petición
    const body = await req.json();
    const { userIds } = body;

    console.log('Petición recibida:', {
      userRole,
      requestedUserIds: userIds,
    });

    // Si es PROF, verificar que los userIds solicitados sean alumnos asignados
    // Si es ESTU, verificar que los userIds solicitados sean su profesor asignado
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
    } else if (userRole === 'ESTU') {
      console.log('Procesando petición ESTU:', { userId: user.id, requestedUserIds: userIds });

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return new Response(
          JSON.stringify({ error: 'userIds debe ser un array no vacío' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Obtener el profesor asignado del estudiante
      console.log('Buscando profesor asignado para estudiante:', { userId: user.id });
      const { data: estudianteProfile, error: estudianteError } = await supabase
        .from('profiles')
        .select('profesor_asignado_id')
        .eq('id', user.id)
        .single();

      console.log('Resultado de búsqueda de perfil:', {
        hasProfile: !!estudianteProfile,
        hasError: !!estudianteError,
        error: estudianteError?.message,
        profesorAsignadoId: estudianteProfile?.profesor_asignado_id,
      });

      if (estudianteError) {
        console.error('Error al obtener perfil del estudiante:', {
          userId: user.id,
          error: estudianteError.message,
          code: estudianteError.code,
        });
        return new Response(
          JSON.stringify({
            error: 'Error al verificar profesor asignado',
            details: estudianteError.message
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!estudianteProfile) {
        console.error('Perfil del estudiante no encontrado:', { userId: user.id });
        return new Response(
          JSON.stringify({
            error: 'Perfil no encontrado',
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const profesorAsignadoId = estudianteProfile.profesor_asignado_id;

      if (!profesorAsignadoId) {
        console.warn('Estudiante sin profesor asignado:', { userId: user.id });
        return new Response(
          JSON.stringify({
            error: 'No tienes un profesor asignado',
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Filtrar userIds: solo permitir el profesor asignado
      const filteredUserIds = userIds.filter(id => id === profesorAsignadoId);

      if (filteredUserIds.length === 0) {
        console.warn('ESTU intentó obtener email de usuario que no es su profesor:', {
          userId: user.id,
          requestedUserIds: userIds,
          profesorAsignadoId,
        });
        return new Response(
          JSON.stringify({
            error: 'Solo puedes obtener el email de tu profesor asignado',
            role: userRole,
            profesorAsignadoId,
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
      console.error('Usuario no es ADMIN, PROF ni ESTU. Rol actual:', userRole, 'User ID:', user.id);
      return new Response(
        JSON.stringify({
          error: 'Rol no autorizado para obtener emails de usuarios',
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

    // Crear un Set con los IDs solicitados para búsqueda rápida O(1)
    const requestedIdsSet = new Set(userIds);
    const emailMap: Record<string, string> = {};

    // Si ya tenemos todos los emails, no necesitamos seguir buscando
    let foundCount = 0;
    const totalRequested = userIds.length;

    // Optimización: Usar getUserById en paralelo para búsquedas directas O(1)
    // Esto es mucho más rápido que listar todos los usuarios, especialmente para 1 o pocos usuarios
    const fetchPromises = userIds.map(async (userId) => {
      // Validar formato UUID básico para evitar llamadas innecesarias
      if (!userId || typeof userId !== 'string' || userId.length < 10) return;

      try {
        const { data, error } = await adminClient.auth.admin.getUserById(userId);

        if (error) {
          // Ignorar error de usuario no encontrado, simplemente no se añade al mapa
          if (!error.message?.includes('not found')) {
            console.warn(`Error al obtener usuario ${userId}:`, error);
          }
          return;
        }

        if (data?.user?.email) {
          emailMap[userId] = data.user.email;
        }
      } catch (err) {
        console.warn(`Excepción al obtener usuario ${userId}:`, err);
      }
    });

    await Promise.all(fetchPromises);

    // Calcular encontrados
    foundCount = Object.keys(emailMap).length;

    // Log para debugging
    if (foundCount < totalRequested) {
      const missingIds = userIds.filter(id => !emailMap[id]);
      console.warn(`No se encontraron todos los emails solicitados. Encontrados: ${foundCount}/${totalRequested}. Faltantes: ${missingIds.length}`);
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

