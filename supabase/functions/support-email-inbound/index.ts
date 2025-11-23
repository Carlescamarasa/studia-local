// Edge Function para procesar emails entrantes de soporte
// Se invoca como webhook desde el proveedor de email (SendGrid/Postmark/SES)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// UUID regex para detectar ticketId en el subject
const UUID_REGEX = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i;

serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, message: 'Service role key no configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Crear cliente Admin con service_role key (bypass RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Parsear el body del webhook
    // Formato esperado: { from: string, subject: string, body: string }
    const { from, subject, body } = await req.json();

    if (!from || !subject || !body) {
      return new Response(
        JSON.stringify({ success: false, message: 'Campos requeridos: from, subject, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar profile por email (desde auth.users)
    // Necesitamos buscar en auth.users usando Admin API
    let alumnoId: string | null = null;
    let alumnoProfile: any = null;

    try {
      // Buscar usuario por email en auth.users
      const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (usersError) {
        console.error('[support-email-inbound] Error listando usuarios:', usersError);
      } else {
        const userByEmail = users?.find(u => u.email?.toLowerCase() === from.toLowerCase());
        if (userByEmail) {
          alumnoId = userByEmail.id;
          
          // Obtener profile para verificar que es ESTU
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id, role')
            .eq('id', alumnoId)
            .single();
          
          if (profile && profile.role === 'ESTU') {
            alumnoProfile = profile;
          } else {
            // Si no es ESTU, no permitir crear tickets desde email
            return new Response(
              JSON.stringify({ success: false, message: 'Solo estudiantes pueden crear tickets desde email' }),
              { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }
    } catch (error) {
      console.error('[support-email-inbound] Error buscando usuario por email:', error);
    }

    if (!alumnoId || !alumnoProfile) {
      return new Response(
        JSON.stringify({ success: false, message: 'Usuario no encontrado o no es estudiante' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extraer ticketId del subject si existe
    // Formato esperado: "[Studia #<uuid>] <titulo>"
    const ticketIdMatch = subject.match(/\[Studia\s+#([a-f0-9-]{36})\]/i);
    const ticketId = ticketIdMatch ? ticketIdMatch[1] : null;

    if (ticketId) {
      // Caso 1: Responder a ticket existente
      try {
        // Validar formato UUID
        if (!UUID_REGEX.test(ticketId)) {
          return new Response(
            JSON.stringify({ success: false, message: 'Formato de ticketId inválido' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Buscar ticket
        const { data: ticket, error: ticketError } = await supabaseAdmin
          .from('support_tickets')
          .select('*')
          .eq('id', ticketId)
          .single();

        if (ticketError || !ticket) {
          return new Response(
            JSON.stringify({ success: false, message: 'Ticket no encontrado' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verificar que el ticket pertenece al alumno
        if (ticket.alumno_id !== alumnoId) {
          return new Response(
            JSON.stringify({ success: false, message: 'No tienes permiso para responder a este ticket' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Si el ticket está cerrado, reabrirlo automáticamente
        if (ticket.estado === 'cerrado') {
          await supabaseAdmin
            .from('support_tickets')
            .update({
              estado: 'abierto',
              cerrado_at: null,
            })
            .eq('id', ticketId);
        }

        // Crear mensaje
        const { data: mensaje, error: mensajeError } = await supabaseAdmin
          .from('support_mensajes')
          .insert({
            ticket_id: ticketId,
            autor_id: alumnoId,
            rol_autor: 'alumno',
            texto: body.trim(),
            media_links: [],
          })
          .select()
          .single();

        if (mensajeError) {
          console.error('[support-email-inbound] Error creando mensaje:', mensajeError);
          return new Response(
            JSON.stringify({ success: false, message: 'Error al crear mensaje', error: mensajeError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Mensaje creado correctamente',
            ticketId: ticketId,
            mensajeId: mensaje.id,
            reabierto: ticket.estado === 'cerrado'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('[support-email-inbound] Error procesando respuesta a ticket:', error);
        return new Response(
          JSON.stringify({ success: false, message: 'Error interno', error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Caso 2: Crear nuevo ticket
      try {
        // Truncar subject si es muy largo (máximo 200 caracteres para titulo)
        const titulo = subject.length > 200 ? subject.substring(0, 197) + '...' : subject;

        // Crear ticket
        const { data: ticket, error: ticketError } = await supabaseAdmin
          .from('support_tickets')
          .insert({
            alumno_id: alumnoId,
            profesor_id: null, // Se puede asignar después
            estado: 'abierto',
            tipo: 'otro',
            titulo: titulo,
          })
          .select()
          .single();

        if (ticketError) {
          console.error('[support-email-inbound] Error creando ticket:', ticketError);
          return new Response(
            JSON.stringify({ success: false, message: 'Error al crear ticket', error: ticketError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Crear mensaje inicial
        const { data: mensaje, error: mensajeError } = await supabaseAdmin
          .from('support_mensajes')
          .insert({
            ticket_id: ticket.id,
            autor_id: alumnoId,
            rol_autor: 'alumno',
            texto: body.trim(),
            media_links: [],
          })
          .select()
          .single();

        if (mensajeError) {
          console.error('[support-email-inbound] Error creando mensaje inicial:', mensajeError);
          // Intentar eliminar el ticket creado si falla el mensaje
          await supabaseAdmin.from('support_tickets').delete().eq('id', ticket.id);
          return new Response(
            JSON.stringify({ success: false, message: 'Error al crear mensaje inicial', error: mensajeError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Ticket creado correctamente',
            ticketId: ticket.id,
            mensajeId: mensaje.id
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('[support-email-inbound] Error creando nuevo ticket:', error);
        return new Response(
          JSON.stringify({ success: false, message: 'Error interno', error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
  } catch (e) {
    console.error('[support-email-inbound] Error general:', e);
    return new Response(
      JSON.stringify({
        success: false,
        message: e.message || 'Error interno en support-email-inbound',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

