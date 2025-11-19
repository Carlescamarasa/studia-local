/**
 * API para gestionar reportes de errores
 * Incluye subida de capturas de pantalla a Supabase Storage
 */

import { supabase } from '@/lib/supabaseClient';
import { isAuthError } from '@/lib/authHelpers';

export interface ErrorReport {
  id: string;
  userId: string;
  category: string;
  description: string;
  screenshotUrl: string | null;
  context: Record<string, any>;
  status: 'nuevo' | 'en_revision' | 'resuelto';
  adminNotes: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateErrorReportData {
  category: string;
  description: string;
  screenshot: Blob | null;
  context: Record<string, any>;
}

/**
 * Sube una captura de pantalla a Supabase Storage
 */
async function uploadScreenshot(blob: Blob, reportId: string): Promise<string | null> {
  try {
    const fileExt = 'png';
    const fileName = `${reportId}-${Date.now()}.${fileExt}`;
    const filePath = `error-reports/${fileName}`;

    // Subir archivo
    const { data, error } = await supabase.storage
      .from('error-reports')
      .upload(filePath, blob, {
        contentType: 'image/png',
        upsert: false,
      });

    if (error) {
      console.error('[errorReportsAPI] Error subiendo captura:', error);
      return null;
    }

    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('error-reports')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (err) {
    console.error('[errorReportsAPI] Error en uploadScreenshot:', err);
    return null;
  }
}

/**
 * Crea un nuevo reporte de error
 */
export async function createErrorReport(data: CreateErrorReportData): Promise<ErrorReport> {
  try {
    // Obtener usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('No se pudo obtener el usuario actual');
    }

    // Crear el reporte primero (sin screenshot)
    const reportData = {
      user_id: user.id,
      category: data.category,
      description: data.description,
      screenshot_url: null,
      context: data.context,
      status: 'nuevo',
    };

    const { data: report, error: insertError } = await supabase
      .from('error_reports')
      .insert(reportData)
      .select()
      .single();

    if (insertError) {
      console.error('[errorReportsAPI] Error creando reporte:', insertError);
      throw insertError;
    }

    // Si hay captura de pantalla, subirla
    let screenshotUrl = null;
    if (data.screenshot) {
      screenshotUrl = await uploadScreenshot(data.screenshot, report.id);
      
      // Actualizar el reporte con la URL de la captura
      if (screenshotUrl) {
        const { error: updateError } = await supabase
          .from('error_reports')
          .update({ screenshot_url: screenshotUrl })
          .eq('id', report.id);

        if (updateError) {
          console.error('[errorReportsAPI] Error actualizando URL de captura:', updateError);
          // No lanzar error, el reporte ya está creado
        }
      }
    }

    // Retornar reporte con screenshot_url actualizado
    return {
      id: report.id,
      userId: report.user_id,
      category: report.category,
      description: report.description,
      screenshotUrl: screenshotUrl || report.screenshot_url,
      context: report.context,
      status: report.status,
      adminNotes: report.admin_notes,
      resolvedBy: report.resolved_by,
      resolvedAt: report.resolved_at,
      createdAt: report.created_at,
      updatedAt: report.updated_at,
    };
  } catch (error: any) {
    if (isAuthError(error)) {
      window.dispatchEvent(new CustomEvent('auth-error', { 
        detail: { error } 
      }));
    }
    throw error;
  }
}

/**
 * Lista todos los reportes (solo para admins)
 */
export async function listErrorReports(filters?: {
  status?: string;
  category?: string;
  userId?: string;
}): Promise<ErrorReport[]> {
  try {
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
      console.error('[errorReportsAPI] Error listando reportes:', error);
      throw error;
    }

    return (data || []).map((report: any) => ({
      id: report.id,
      userId: report.user_id,
      category: report.category,
      description: report.description,
      screenshotUrl: report.screenshot_url,
      context: report.context,
      status: report.status,
      adminNotes: report.admin_notes,
      resolvedBy: report.resolved_by,
      resolvedAt: report.resolved_at,
      createdAt: report.created_at,
      updatedAt: report.updated_at,
    }));
  } catch (error: any) {
    if (isAuthError(error)) {
      window.dispatchEvent(new CustomEvent('auth-error', { 
        detail: { error } 
      }));
    }
    throw error;
  }
}

/**
 * Obtiene un reporte por ID
 */
export async function getErrorReport(id: string): Promise<ErrorReport | null> {
  try {
    const { data, error } = await supabase
      .from('error_reports')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No encontrado
      }
      console.error('[errorReportsAPI] Error obteniendo reporte:', error);
      throw error;
    }

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
  } catch (error: any) {
    if (isAuthError(error)) {
      window.dispatchEvent(new CustomEvent('auth-error', { 
        detail: { error } 
      }));
    }
    throw error;
  }
}

/**
 * Actualiza el estado de un reporte (solo para admins)
 */
export async function updateReportStatus(
  id: string,
  status: 'nuevo' | 'en_revision' | 'resuelto',
  adminNotes?: string
): Promise<ErrorReport> {
  try {
    // Obtener usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error('No se pudo obtener el usuario actual');
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (adminNotes !== undefined) {
      updateData.admin_notes = adminNotes;
    }

    // Si se marca como resuelto, guardar quién lo resolvió y cuándo
    if (status === 'resuelto') {
      updateData.resolved_by = user.id;
      updateData.resolved_at = new Date().toISOString();
    } else {
      // Si se cambia de resuelto a otro estado, limpiar resolved_by y resolved_at
      updateData.resolved_by = null;
      updateData.resolved_at = null;
    }

    const { data, error } = await supabase
      .from('error_reports')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[errorReportsAPI] Error actualizando reporte:', error);
      throw error;
    }

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
  } catch (error: any) {
    if (isAuthError(error)) {
      window.dispatchEvent(new CustomEvent('auth-error', { 
        detail: { error } 
      }));
    }
    throw error;
  }
}

