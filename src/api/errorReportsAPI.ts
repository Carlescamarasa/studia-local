/**
 * API para gestionar reportes de errores
 */

import { supabase } from '@/lib/supabaseClient';

export interface ErrorReport {
  id: string;
  userId: string | null;
  createdBy: string | null;
  createdByName: string | null; // full_name del autor desde profiles
  category: string;
  description: string;
  screenshotUrl: string | null;
  audioUrl: string | null;
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
  audioUrl?: string | null;
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
  // Obtener el usuario autenticado para created_by
  const { data: { user } } = await supabase.auth.getUser();
  const createdBy = user?.id || null;

  const { data: report, error } = await supabase
    .from('error_reports')
    .insert({
      user_id: data.userId,
      created_by: createdBy, // Usar auth.uid() automáticamente
      category: data.category,
      description: data.description,
      screenshot_url: data.screenshotUrl || null,
      audio_url: data.audioUrl || null,
      context: data.context,
      status: 'nuevo'
    })
      .select(`
        *,
        created_by_profile:created_by (
          full_name
        )
      `)
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
  // Verificar sesión antes de hacer la petición
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('No hay sesión activa');
  }

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
    // No loguear errores CORS o de autenticación (son esperados si la sesión expiró)
    if (error.code !== 'PGRST301' && error.status !== 401 && error.status !== 403) {
      console.error('[errorReportsAPI] Error listando reportes:', {
        error: error?.message || error,
        code: error?.code,
      });
    }
    throw error;
  }

  // Obtener nombres de los autores
  const reportsWithNames = await Promise.all(
    (data || []).map(async (report) => {
      if (report.created_by) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', report.created_by)
          .single();
        return { ...report, created_by_profile: profile ? { full_name: profile.full_name } : null };
      }
      return { ...report, created_by_profile: null };
    })
  );

  return reportsWithNames.map(mapToErrorReport);
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

  // Obtener nombre del autor si existe
  let reportWithName = { ...data, created_by_profile: null };
  if (data?.created_by) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', data.created_by)
      .single();
    reportWithName.created_by_profile = profile ? { full_name: profile.full_name } : null;
  }

  return mapToErrorReport(reportWithName);
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
 * Actualizar múltiples reportes (solo para admins)
 */
export async function updateMultipleErrorReports(
  ids: string[],
  updates: UpdateReportData
): Promise<ErrorReport[]> {
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
    .in('id', ids)
    .select();

  if (error) {
    console.error('[errorReportsAPI] Error actualizando múltiples reportes:', {
      error: error?.message || error,
      code: error?.code,
    });
    throw error;
  }

  return (data || []).map(mapToErrorReport);
}

/**
 * Eliminar un reporte (solo para admins)
 */
export async function deleteErrorReport(id: string): Promise<void> {
  const { error } = await supabase
    .from('error_reports')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[errorReportsAPI] Error eliminando reporte:', {
      error: error?.message || error,
      code: error?.code,
    });
    throw error;
  }
}

/**
 * Eliminar múltiples reportes (solo para admins)
 */
export async function deleteMultipleErrorReports(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from('error_reports')
    .delete()
    .in('id', ids);

  if (error) {
    console.error('[errorReportsAPI] Error eliminando múltiples reportes:', {
      error: error?.message || error,
      code: error?.code,
    });
    throw error;
  }
}

/**
 * Mapear datos de Supabase (snake_case) a ErrorReport (camelCase)
 */
function mapToErrorReport(data: any): ErrorReport {
    // Extraer full_name del JOIN con profiles
    const createdByName = data.created_by_profile?.full_name || null;
    
    return {
      id: data.id,
      userId: data.user_id,
      createdBy: data.created_by,
      createdByName: createdByName,
      category: data.category,
      description: data.description,
      screenshotUrl: data.screenshot_url,
      audioUrl: data.audio_url,
      context: data.context,
      status: data.status,
      adminNotes: data.admin_notes,
      resolvedBy: data.resolved_by,
      resolvedAt: data.resolved_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
}
