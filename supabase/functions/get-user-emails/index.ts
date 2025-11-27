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

    // Usar listUsers() con paginación para obtener todos los usuarios de una vez
    // Esto evita el problema N+1 de hacer queries individuales
    let page = 1;
    const perPage = 1000; // Máximo permitido por Supabase
    let hasMore = true;

    while (hasMore && foundCount < totalRequested) {
      const { data, error } = await adminClient.auth.admin.listUsers({
        page,
        perPage,
      });

      if (error) {
        console.error(`Error al listar usuarios (página ${page}):`, error);
        // Si hay error, intentar continuar con la siguiente página o terminar
        // Dependiendo del tipo de error, podríamos querer fallar completamente
        if (error.message?.includes('rate limit') || error.status === 429) {
          // Rate limit - esperar un poco y continuar
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        // Para otros errores, continuar con la siguiente página
        page++;
        if (page > 10) {
          // Límite de seguridad: no más de 10 páginas
          console.warn('Límite de páginas alcanzado. Algunos emails pueden no haberse obtenido.');
          break;
        }
        continue;
      }

      if (!data?.users || data.users.length === 0) {
        hasMore = false;
        break;
      }

      // Filtrar usuarios por los IDs solicitados y construir el mapa
      for (const user of data.users) {
        if (user.id && requestedIdsSet.has(user.id) && user.email) {
          emailMap[user.id] = user.email;
          foundCount++;
          
          // Si ya encontramos todos los IDs solicitados, podemos detener la búsqueda
          if (foundCount >= totalRequested) {
            hasMore = false;
            break;
          }
        }
      }

      // Verificar si hay más páginas
      // listUsers() devuelve información de paginación en data
      // Si obtenemos menos usuarios que perPage, hemos llegado al final
      if (data.users.length < perPage) {
        hasMore = false;
      } else {
        page++;
        // Límite de seguridad: no más de 10 páginas (10,000 usuarios)
        if (page > 10) {
          console.warn('Límite de páginas alcanzado. Algunos emails pueden no haberse obtenido.');
          hasMore = false;
        }
      }
    }

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

