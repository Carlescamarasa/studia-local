/**
 * Cliente para trabajar con tickets de soporte en Supabase
 */

import { supabase } from '@/lib/supabaseClient';
import type { SupportTicket, SupportMensaje, CreateSupportTicketInput, CreateSupportMensajeInput, UpdateSupportTicketInput } from '@/types/domain';

/**
 * Obtener todos los tickets de un alumno
 */
export async function getTicketsByAlumno(alumnoId: string): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('alumno_id', alumnoId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapTicketFromDB);
}

/**
 * Obtener todos los tickets asignados a un profesor
 */
export async function getTicketsByProfesor(profesorId: string): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('profesor_id', profesorId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapTicketFromDB);
}

/**
 * Obtener todos los tickets (solo para ADMIN)
 */
export async function getAllTickets(): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapTicketFromDB);
}

/**
 * Obtener un ticket por ID
 */
export async function getTicketById(ticketId: string): Promise<SupportTicket | null> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
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
 * Obtener todos los mensajes de un ticket
 */
export async function getMensajesByTicket(ticketId: string): Promise<SupportMensaje[]> {
  const { data, error } = await supabase
    .from('support_mensajes')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapMensajeFromDB);
}

/**
 * Crear un nuevo mensaje
 */
export async function createMensaje(input: CreateSupportMensajeInput): Promise<SupportMensaje> {
  const dbData = mapMensajeToDB(input);
  const { data, error } = await supabase
    .from('support_mensajes')
    .insert(dbData)
    .select()
    .single();

  if (error) throw error;
  return mapMensajeFromDB(data);
}

/**
 * Mapear ticket de DB (snake_case) a dominio (camelCase)
 */
function mapTicketFromDB(db: any): SupportTicket {
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

  return {
    id: db.id,
    ticketId: db.ticket_id,
    autorId: db.autor_id,
    rolAutor: db.rol_autor,
    texto: db.texto,
    mediaLinks,
    created_at: db.created_at,
  };
}

/**
 * Mapear mensaje de dominio (camelCase) a DB (snake_case)
 */
function mapMensajeToDB(mensaje: CreateSupportMensajeInput): any {
  return {
    ticket_id: mensaje.ticketId,
    autor_id: mensaje.autorId,
    rol_autor: mensaje.rolAutor,
    texto: mensaje.texto,
    media_links: mensaje.mediaLinks || [],
  };
}

