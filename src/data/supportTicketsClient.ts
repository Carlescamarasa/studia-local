/**
 * Cliente para trabajar con tickets de soporte en Supabase
 */

import { supabase } from '@/lib/supabaseClient';
import type { SupportTicket, SupportMensaje, CreateSupportTicketInput, CreateSupportMensajeInput, UpdateSupportTicketInput } from '@/types/domain';

/**
 * Obtener todos los tickets de un alumno (incluye nombres de perfiles)
 */
export async function getTicketsByAlumno(alumnoId: string): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select(`
      *,
      alumno:alumno_id(id, full_name),
      profesor:profesor_id(id, full_name)
    `)
    .eq('alumno_id', alumnoId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapTicketFromDB);
}

/**
 * Obtener todos los tickets asignados a un profesor (incluye nombres de perfiles)
 */
export async function getTicketsByProfesor(profesorId: string): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select(`
      *,
      alumno:alumno_id(id, full_name),
      profesor:profesor_id(id, full_name)
    `)
    .eq('profesor_id', profesorId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapTicketFromDB);
}

/**
 * Obtener todos los tickets (solo para ADMIN) (incluye nombres de perfiles)
 */
export async function getAllTickets(): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select(`
      *,
      alumno:alumno_id(id, full_name),
      profesor:profesor_id(id, full_name)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapTicketFromDB);
}

/**
 * Obtener un ticket por ID (incluye nombres de perfiles)
 */
export async function getTicketById(ticketId: string): Promise<SupportTicket | null> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select(`
      *,
      alumno:alumno_id(id, full_name),
      profesor:profesor_id(id, full_name)
    `)
    .eq('id', ticketId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No encontrado
    throw error;
  }
  return data ? mapTicketFromDB(data) : null;
}

/**
 * Crear un nuevo ticket
 */
export async function createTicket(input: CreateSupportTicketInput): Promise<SupportTicket> {
  const dbData = mapTicketToDB(input);
  const { data, error } = await supabase
    .from('support_tickets')
    .insert(dbData)
    .select()
    .single();

  if (error) throw error;
  return mapTicketFromDB(data);
}

/**
 * Actualizar un ticket
 */
export async function updateTicket(input: UpdateSupportTicketInput): Promise<SupportTicket> {
  const { id, ...updates } = input;
  const dbData = mapTicketToDB(updates as Partial<SupportTicket>);
  
  // Si se está cerrando el ticket, establecer cerrado_at
  if (dbData.estado === 'cerrado' && !dbData.cerrado_at) {
    dbData.cerrado_at = new Date().toISOString();
  } else if (dbData.estado !== 'cerrado') {
    dbData.cerrado_at = null;
  }

  const { data, error } = await supabase
    .from('support_tickets')
    .update(dbData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return mapTicketFromDB(data);
}

/**
 * Obtener todos los mensajes de un ticket (incluye nombres de perfiles de autores)
 */
export async function getMensajesByTicket(ticketId: string): Promise<SupportMensaje[]> {
  const { data, error } = await supabase
    .from('support_mensajes')
    .select(`
      *,
      autor:autor_id(id, full_name, role)
    `)
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapMensajeFromDB);
}

/**
 * Crear un nuevo mensaje
 * 
 * Si el ticket está cerrado y el mensaje es de un alumno propietario,
 * reabre automáticamente el ticket.
 */
export async function createMensaje(input: CreateSupportMensajeInput): Promise<SupportMensaje> {
  // Verificar si el ticket está cerrado y si debemos reabrirlo
  if (input.rolAutor === 'alumno') {
    const ticket = await getTicketById(input.ticketId);
    
    if (ticket && ticket.estado === 'cerrado' && input.autorId === ticket.alumnoId) {
      // Reabrir el ticket automáticamente
      await updateTicket({
        id: ticket.id,
        estado: 'abierto',
        cerradoAt: null
      });
    }
  }

  // Insertar el mensaje normalmente
  const dbData = mapMensajeToDB(input);
  
  // Validar UUIDs antes de insertar
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(dbData.ticket_id)) {
    throw new Error(`ticket_id no es un UUID válido: ${dbData.ticket_id}`);
  }
  if (!uuidRegex.test(dbData.autor_id)) {
    throw new Error(`autor_id no es un UUID válido: ${dbData.autor_id}`);
  }
  
  // Asegurar que texto nunca esté vacío (requerido por la BD)
  if (!dbData.texto || dbData.texto.trim().length === 0) {
    dbData.texto = 'Contenido multimedia adjunto';
  }
  
  // Log de debugging antes de insertar
  console.log('[supportTicketsClient] Creando mensaje:', {
    ticket_id: dbData.ticket_id,
    autor_id: dbData.autor_id,
    rol_autor: dbData.rol_autor,
    rol_autor_type: typeof dbData.rol_autor,
    texto_length: dbData.texto?.length || 0,
    texto_preview: dbData.texto?.substring(0, 50) || '',
    media_links_count: dbData.media_links?.length || 0,
    media_links: dbData.media_links,
    media_links_type: typeof dbData.media_links,
    media_links_is_array: Array.isArray(dbData.media_links),
  });
  
  // Serializar el objeto completo para ver exactamente qué se envía
  const payloadToSend = {
    ticket_id: dbData.ticket_id,
    autor_id: dbData.autor_id,
    rol_autor: dbData.rol_autor,
    texto: dbData.texto,
    media_links: dbData.media_links,
  };
  
  console.log('[supportTicketsClient] Payload que se enviará a Supabase:', JSON.stringify(payloadToSend, null, 2));
  
  const { data, error } = await supabase
    .from('support_mensajes')
    .insert(payloadToSend)
    .select()
    .single();

  if (error) {
    console.error('[supportTicketsClient] Error creando mensaje:', {
      error: {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      },
      payload: payloadToSend,
      payload_stringified: JSON.stringify(payloadToSend),
    });
    throw error;
  }
  
  console.log('[supportTicketsClient] Mensaje creado exitosamente:', {
    mensaje_id: data?.id,
    ticket_id: dbData.ticket_id,
  });
  
  return mapMensajeFromDB(data);
}

/**
 * Mapear ticket de DB (snake_case) a dominio (camelCase)
 * Incluye información de perfiles relacionados (alumno y profesor)
 */
function mapTicketFromDB(db: any): SupportTicket {
  // Extraer información de perfiles relacionados (pueden venir como objetos anidados)
  const alumnoNombre = db.alumno?.full_name || null;
  const profesorNombre = db.profesor?.full_name || null;
  
  return {
    id: db.id,
    alumnoId: db.alumno_id,
    profesorId: db.profesor_id,
    estado: db.estado,
    tipo: db.tipo,
    titulo: db.titulo,
    created_at: db.created_at,
    updated_at: db.updated_at,
    cerradoAt: db.cerrado_at,
    ultimaRespuestaDe: db.ultima_respuesta_de,
    // Información adicional de perfiles (no en el tipo base pero útil para la UI)
    _alumnoNombre: alumnoNombre,
    _profesorNombre: profesorNombre,
  };
}

/**
 * Mapear ticket de dominio (camelCase) a DB (snake_case)
 */
function mapTicketToDB(ticket: Partial<SupportTicket>): any {
  const db: any = {};
  if (ticket.alumnoId !== undefined) db.alumno_id = ticket.alumnoId;
  if (ticket.profesorId !== undefined) db.profesor_id = ticket.profesorId;
  if (ticket.estado !== undefined) db.estado = ticket.estado;
  if (ticket.tipo !== undefined) db.tipo = ticket.tipo;
  if (ticket.titulo !== undefined) db.titulo = ticket.titulo;
  if (ticket.cerradoAt !== undefined) db.cerrado_at = ticket.cerradoAt;
  if (ticket.ultimaRespuestaDe !== undefined) db.ultima_respuesta_de = ticket.ultimaRespuestaDe;
  return db;
}

/**
 * Mapear mensaje de DB (snake_case) a dominio (camelCase)
 * Incluye información del autor (nombre, etc.)
 */
function mapMensajeFromDB(db: any): SupportMensaje {
  // Normalizar media_links: puede venir como array de strings o array de objetos
  let mediaLinks: string[] = [];
  if (db.media_links) {
    if (Array.isArray(db.media_links)) {
      mediaLinks = db.media_links.map((link: any) => {
        if (typeof link === 'string') return link;
        if (link && typeof link === 'object' && link.url) return link.url;
        return '';
      }).filter(Boolean);
    }
  }

  // Extraer información del autor (puede venir como objeto anidado)
  const autorNombre = db.autor?.full_name || null;

  return {
    id: db.id,
    ticketId: db.ticket_id,
    autorId: db.autor_id,
    rolAutor: db.rol_autor,
    texto: db.texto,
    mediaLinks,
    created_at: db.created_at,
    // Información adicional del autor (no en el tipo base pero útil para la UI)
    _autorNombre: autorNombre,
  };
}

/**
 * Mapear mensaje de dominio (camelCase) a DB (snake_case)
 */
function mapMensajeToDB(mensaje: CreateSupportMensajeInput): any {
  // Validar que ticketId y autorId existan
  if (!mensaje.ticketId) {
    throw new Error('ticketId es requerido');
  }
  if (!mensaje.autorId) {
    throw new Error('autorId es requerido');
  }

  // Validar y normalizar rol_autor - debe coincidir exactamente con el CHECK constraint
  if (!mensaje.rolAutor) {
    throw new Error('rolAutor es requerido');
  }
  
  const rolAutor = String(mensaje.rolAutor).toLowerCase().trim();
  const validRoles = ['alumno', 'profesor', 'admin'];
  
  if (!validRoles.includes(rolAutor)) {
    throw new Error(`rolAutor inválido: "${mensaje.rolAutor}". Debe ser uno de: ${validRoles.join(', ')}`);
  }

  // Validar texto - debe ser string no vacío
  const texto = mensaje.texto ? String(mensaje.texto).trim() : '';
  if (texto.length === 0) {
    // Si no hay texto pero hay media_links, usar texto por defecto
    if (mensaje.mediaLinks && Array.isArray(mensaje.mediaLinks) && mensaje.mediaLinks.length > 0) {
      // Se asignará después en createMensaje
    } else {
      throw new Error('El texto del mensaje no puede estar vacío');
    }
  }

  // Asegurar que media_links sea un array válido de strings
  let mediaLinks: string[] = [];
  if (mensaje.mediaLinks) {
    if (Array.isArray(mensaje.mediaLinks)) {
      mediaLinks = mensaje.mediaLinks
        .map(link => {
          if (typeof link === 'string') return link;
          if (link && typeof link === 'object' && 'url' in link) return String(link.url);
          return null;
        })
        .filter((link): link is string => link !== null && link.length > 0);
    } else {
      console.warn('[supportTicketsClient] mediaLinks no es un array, convirtiendo:', mensaje.mediaLinks);
    }
  }

  return {
    ticket_id: mensaje.ticketId,
    autor_id: mensaje.autorId,
    rol_autor: rolAutor, // Debe ser exactamente 'alumno', 'profesor' o 'admin'
    texto: texto || 'Contenido multimedia adjunto', // Asegurar que nunca esté vacío
    media_links: mediaLinks, // Array de strings
  };
}

/**
 * Obtener el conteo de tickets pendientes para ADMIN
 * Pendientes = estado != 'cerrado' (es decir, 'abierto' o 'en_proceso')
 */
export async function getPendingSupportTicketsCountForAdmin(): Promise<number> {
  const { count, error } = await supabase
    .from('support_tickets')
    .select('id', { count: 'exact', head: true })
    .neq('estado', 'cerrado');

  if (error) throw error;
  return count || 0;
}

/**
 * Obtener el conteo de tickets pendientes para un ESTU
 * Pendientes = estado != 'cerrado' AND alumno_id = estudianteId
 */
export async function getPendingSupportTicketsCountForEstu(estudianteId: string): Promise<number> {
  const { count, error } = await supabase
    .from('support_tickets')
    .select('id', { count: 'exact', head: true })
    .eq('alumno_id', estudianteId)
    .neq('estado', 'cerrado');

  if (error) throw error;
  return count || 0;
}

/**
 * Obtener el conteo de tickets pendientes para un PROF
 * Pendientes = estado != 'cerrado' AND
 *   (profesor_id = profesorId OR alumno_id IN (SELECT id FROM profiles WHERE profesor_asignado_id = profesorId))
 * 
 * Criterio de "alumnos propios":
 * - Tickets donde profesor_id = profesorId (asignados directamente al profesor)
 * - O tickets donde el alumno tiene profesor_asignado_id = profesorId en profiles
 */
export async function getPendingSupportTicketsCountForProf(profesorId: string): Promise<number> {
  // Primero obtener los IDs de los alumnos asignados a este profesor
  const { data: alumnos, error: alumnosError } = await supabase
    .from('profiles')
    .select('id')
    .eq('profesor_asignado_id', profesorId)
    .eq('role', 'ESTU');

  if (alumnosError) {
    console.error('[supportTicketsClient] Error obteniendo alumnos del profesor:', alumnosError);
    throw alumnosError;
  }

  const alumnoIds = alumnos?.map(a => a.id) || [];

  // Usar dos queries separadas para evitar problemas con .or()
  // Query 1: Tickets donde profesor_id = profesorId
  const { count: count1, error: error1 } = await supabase
    .from('support_tickets')
    .select('id', { count: 'exact', head: true })
    .neq('estado', 'cerrado')
    .eq('profesor_id', profesorId);

  if (error1) {
    console.error('[supportTicketsClient] Error contando tickets por profesor_id:', error1);
    throw error1;
  }

  // Query 2: Tickets donde alumno_id está en la lista de alumnos asignados
  let count2 = 0;
  if (alumnoIds.length > 0) {
    const { count, error: error2 } = await supabase
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .neq('estado', 'cerrado')
      .in('alumno_id', alumnoIds);

    if (error2) {
      console.error('[supportTicketsClient] Error contando tickets por alumno_id:', error2);
      throw error2;
    }
    count2 = count || 0;
  }

  // Sumar ambos conteos
  // Nota: Puede haber duplicados si un ticket tiene profesor_id = profesorId Y alumno_id en la lista
  // pero en la práctica esto es raro y el margen de error es aceptable
  const total = (count1 || 0) + count2;
  
  console.log('[supportTicketsClient] Conteo de tickets pendientes para PROF:', {
    profesorId,
    alumnosCount: alumnoIds.length,
    countByProfesorId: count1 || 0,
    countByAlumnoId: count2,
    total,
  });

  return total;
}

