/**
 * Utilidades para envío de emails de soporte
 * 
 * Este módulo proporciona funciones para enviar emails de notificación
 * cuando PROF/ADMIN responde a un ticket.
 * 
 * NOTA: La integración real con el proveedor de email (SendGrid/Postmark/SES)
 * debe implementarse en la función sendEmailViaProvider().
 */

import { supabase } from '@/lib/supabaseClient';

/**
 * Obtiene el email de un usuario por su ID usando la Edge Function get-user-emails
 * Solo funciona para usuarios ADMIN (la Edge Function requiere permisos de ADMIN)
 * 
 * @param userId - ID del usuario
 * @returns Email del usuario o null si no se puede obtener
 */
export async function getUserEmailById(userId: string): Promise<string | null> {
  if (!userId) return null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return null;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl) {
      return null;
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
    
    if (supabaseAnonKey) {
      headers['apikey'] = supabaseAnonKey;
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/get-user-emails`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ userIds: [userId] }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.emails && data.emails[userId]) {
        return data.emails[userId];
      }
    }
  } catch (error) {
    console.error('[supportEmail] Error obteniendo email del usuario:', error);
  }

  return null;
}

/**
 * Formatea el subject del email según el estándar: [Studia #<ticketId>] <titulo>
 */
export function formatSupportEmailSubject(ticketId: string, ticketTitulo: string): string {
  return `[Studia #${ticketId}] ${ticketTitulo}`;
}

/**
 * Construye el body del email de respuesta
 */
export function buildSupportEmailBody(
  mensajeTexto: string,
  autorNombre: string,
  ticketUrl?: string
): string {
  const baseUrl = import.meta.env.VITE_APP_URL || import.meta.env.VITE_SUPABASE_URL?.replace('/rest/v1', '') || '';
  const ticketLink = ticketUrl || (baseUrl ? `${baseUrl}/soporte` : '');

  const body = `
${mensajeTexto}

---
${autorNombre}
Estudia - La Trompeta Sonará
${ticketLink ? `\nVer ticket: ${ticketLink}` : ''}
`;

  return body.trim();
}

/**
 * Construye el body HTML del email (versión HTML)
 */
export function buildSupportEmailBodyHTML(
  mensajeTexto: string,
  autorNombre: string,
  ticketUrl?: string
): string {
  const baseUrl = import.meta.env.VITE_APP_URL || import.meta.env.VITE_SUPABASE_URL?.replace('/rest/v1', '') || '';
  const ticketLink = ticketUrl || (baseUrl ? `${baseUrl}/soporte` : '');

  // Convertir saltos de línea a <br>
  const textoHTML = mensajeTexto.replace(/\n/g, '<br>');

  return `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="margin-bottom: 20px;">
    ${textoHTML}
  </div>
  <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
  <div style="font-size: 12px; color: #666;">
    <p><strong>${autorNombre}</strong><br>
    Estudia - La Trompeta Sonará</p>
    ${ticketLink ? `<p><a href="${ticketLink}" style="color: #007bff;">Ver ticket</a></p>` : ''}
  </div>
</div>
`.trim();
}

/**
 * Stub para enviar email a través del proveedor
 * 
 * TODO: Integrar con proveedor de email real (SendGrid/Postmark/SES)
 * 
 * VARIABLES DE ENTORNO NECESARIAS:
 * 
 * Para SendGrid:
 *   - SENDGRID_API_KEY: API key de SendGrid
 *   - Configurar en: Deno.env (Edge Function) o import.meta.env (cliente)
 * 
 * Para Postmark:
 *   - POSTMARK_API_KEY: API key de Postmark
 *   - Configurar en: Deno.env (Edge Function) o import.meta.env (cliente)
 * 
 * Para AWS SES:
 *   - AWS_ACCESS_KEY_ID: Access key de AWS
 *   - AWS_SECRET_ACCESS_KEY: Secret key de AWS
 *   - AWS_REGION: Región de SES (ej: 'us-east-1')
 *   - Configurar en: Deno.env (Edge Function)
 * 
 * Para Resend:
 *   - RESEND_API_KEY: API key de Resend
 *   - Configurar en: Deno.env (Edge Function) o import.meta.env (cliente)
 * 
 * NOTA: Si se implementa en Edge Function, usar Deno.env.get('VARIABLE_NAME')
 *       Si se implementa en cliente, usar import.meta.env.VITE_VARIABLE_NAME
 * 
 * Ejemplo de integración con SendGrid:
 * ```typescript
 * import sgMail from '@sendgrid/mail';
 * 
 * sgMail.setApiKey(Deno.env.get('SENDGRID_API_KEY') || '');
 * 
 * await sgMail.send({
 *   to: toEmail,
 *   from: 'soporte@mi-dominio.com',
 *   subject: subject,
 *   text: bodyText,
 *   html: bodyHTML,
 * });
 * ```
 * 
 * Ejemplo de integración con Postmark:
 * ```typescript
 * import { ServerClient } from 'postmark';
 * 
 * const client = new ServerClient(Deno.env.get('POSTMARK_API_KEY') || '');
 * 
 * await client.sendEmail({
 *   From: 'soporte@mi-dominio.com',
 *   To: toEmail,
 *   Subject: subject,
 *   TextBody: bodyText,
 *   HtmlBody: bodyHTML,
 * });
 * ```
 */
async function sendEmailViaProvider(
  toEmail: string,
  subject: string,
  bodyText: string,
  bodyHTML?: string
): Promise<void> {
  // Log antes de enviar con información completa
  console.log('[supportEmail] Preparando envío de email:', {
    to: toEmail,
    subject,
    bodyTextLength: bodyText.length,
    bodyHTMLLength: bodyHTML?.length || 0,
    bodyTextPreview: bodyText.substring(0, 150) + (bodyText.length > 150 ? '...' : ''),
    timestamp: new Date().toISOString(),
  });

  // STUB: Por ahora solo loguea
  // TODO: Integrar con proveedor de email real
  // 
  // IMPORTANTE: Esta función NO envía emails realmente. Es solo un stub para desarrollo.
  // Para producción, necesitas:
  // 1. Crear una Edge Function en Supabase (ej: send-support-email)
  // 2. Configurar un proveedor de email (SendGrid, Postmark, Resend, SES)
  // 3. Implementar la lógica de envío en la Edge Function
  // 4. Llamar a la Edge Function desde aquí en lugar de sendEmailViaProvider
  console.warn('[supportEmail] ⚠️ STUB MODE - Email NO se está enviando realmente.');
  console.warn('[supportEmail] Para enviar emails reales, implementa una Edge Function con un proveedor de email.');

  // Simular delay de red
  await new Promise(resolve => setTimeout(resolve, 100));

  // Log de éxito simulado
  console.log('[supportEmail] Email enviado exitosamente (STUB):', {
    to: toEmail,
    subject,
    timestamp: new Date().toISOString(),
  });

  // En producción, descomentar y usar el proveedor real:
  // throw new Error('sendEmailViaProvider no implementado. Integra con SendGrid/Postmark/SES.');
}

/**
 * Envía un email de respuesta de soporte al alumno
 * 
 * @param ticketId - ID del ticket
 * @param ticketTitulo - Título del ticket
 * @param alumnoEmail - Email del alumno
 * @param mensajeTexto - Texto del mensaje del PROF/ADMIN
 * @param autorNombre - Nombre del autor (PROF/ADMIN)
 * @param ticketUrl - URL opcional del ticket en la web
 */
/**
 * Envía un email de respuesta de soporte al alumno
 * 
 * @param ticketId - ID del ticket
 * @param ticketTitulo - Título del ticket
 * @param alumnoEmail - Email del alumno
 * @param mensajeTexto - Texto del mensaje del PROF/ADMIN
 * @param autorNombre - Nombre del autor (PROF/ADMIN)
 * @param ticketUrl - URL opcional del ticket en la web
 */
export async function sendSupportEmailResponse(
  ticketId: string,
  ticketTitulo: string,
  alumnoEmail: string,
  mensajeTexto: string,
  autorNombre: string,
  ticketUrl?: string
): Promise<void> {
  console.log('[supportEmail] Iniciando envío de email de respuesta:', {
    ticketId,
    ticketTitulo,
    alumnoEmail,
    autorNombre,
    mensajeLength: mensajeTexto.length,
    timestamp: new Date().toISOString(),
  });

  if (!alumnoEmail) {
    const error = new Error('Email del alumno requerido');
    console.error('[supportEmail] Error de validación:', error);
    throw error;
  }

  const subject = formatSupportEmailSubject(ticketId, ticketTitulo);
  const bodyText = buildSupportEmailBody(mensajeTexto, autorNombre, ticketUrl);
  const bodyHTML = buildSupportEmailBodyHTML(mensajeTexto, autorNombre, ticketUrl);

  try {
    await sendEmailViaProvider(alumnoEmail, subject, bodyText, bodyHTML);
    console.log('[supportEmail] Email de respuesta enviado correctamente:', {
      ticketId,
      alumnoEmail,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Log error con detalles completos
    console.error('[supportEmail] Error enviando email de respuesta:', {
      ticketId,
      alumnoEmail,
      subject,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
      timestamp: new Date().toISOString(),
    });
    throw error; // Re-lanzar para que el caller pueda manejarlo si lo desea
  }
}

