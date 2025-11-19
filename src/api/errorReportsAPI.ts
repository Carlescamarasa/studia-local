/**
 * API para gestionar reportes de errores
 */

import { supabase } from '@/lib/supabaseClient';

export interface ErrorReport {
  id: string;
  userId: string | null;
  category: string;
  description: string;
  screenshotUrl: string | null;
  context: any;
  status: 'nuevo' | 'en_revision' | 'resuelto';
  adminNotes: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportData {
  userId: string | null;
  category: string;
  description: string;
  screenshotUrl?: string | null;
  context: any;
}

export interface UpdateReportData {
  status?: 'nuevo' | 'en_revision' | 'resuelto';
  adminNotes?: string | null;
  resolvedBy?: string | null;
}

/**
 * Crear un nuevo reporte de error
 */
export async function createErrorReport(data: CreateReportData): Promise<ErrorReport> {
  const { data: report, error } = await supabase
    .from('error_reports')
    .insert({
      user_id: data.userId,
      category: data.category,
      description: data.description,
      screenshot_url: data.screenshotUrl || null,
      context: data.context,
      status: 'nuevo'
    })
      .select()
      .single();

  if (error) {
    console.error('[errorReportsAPI] Error creando reporte:', {
      error: error?.message || error,
      code: error?.code,
    });
    throw error;
  }

  return mapToErrorReport(report);
}

/**
 * Listar reportes (solo para admins)
 */
export async function listErrorReports(filters?: {
  status?: string;
  category?: string;
  userId?: string;
}): Promise<ErrorReport[]> {
    let query = supabase
      .from('error_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }

    const { data, error } = await query;

    if (error) {
    console.error('[errorReportsAPI] Error listando reportes:', {
      error: error?.message || error,
      code: error?.code,
    });
    throw error;
  }

  return (data || []).map(mapToErrorReport);
}

/**
 * Obtener un reporte por ID
 */
export async function getErrorReport(id: string): Promise<ErrorReport | null> {
    const { data, error } = await supabase
      .from('error_reports')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
    if (error.code === 'PGRST116') return null; // No encontrado
    console.error('[errorReportsAPI] Error obteniendo reporte:', {
      error: error?.message || error,
      code: error?.code,
    });
    throw error;
  }

  return mapToErrorReport(data);
}

/**
 * Actualizar estado de un reporte (solo para admins)
 */
export async function updateErrorReport(
  id: string,
  updates: UpdateReportData
): Promise<ErrorReport> {
  const updateData: any = {};
  
  if (updates.status !== undefined) {
    updateData.status = updates.status;
  }
  if (updates.adminNotes !== undefined) {
    updateData.admin_notes = updates.adminNotes;
    }
  if (updates.resolvedBy !== undefined) {
    updateData.resolved_by = updates.resolvedBy;
    if (updates.resolvedBy && updates.status === 'resuelto') {
      updateData.resolved_at = new Date().toISOString();
    } else if (!updates.resolvedBy) {
      updateData.resolved_at = null;
    }
    }

    const { data, error } = await supabase
      .from('error_reports')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
    console.error('[errorReportsAPI] Error actualizando reporte:', {
      error: error?.message || error,
      code: error?.code,
    });
      throw error;
    }

  return mapToErrorReport(data);
}

/**
 * Mapear datos de Supabase (snake_case) a ErrorReport (camelCase)
 */
function mapToErrorReport(data: any): ErrorReport {
    return {
      id: data.id,
      userId: data.user_id,
      category: data.category,
      description: data.description,
      screenshotUrl: data.screenshot_url,
      context: data.context,
      status: data.status,
      adminNotes: data.admin_notes,
      resolvedBy: data.resolved_by,
      resolvedAt: data.resolved_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
}
