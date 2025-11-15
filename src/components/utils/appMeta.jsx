/**
 * Obtiene el nombre de la aplicación desde meta tags o configuración global
 * @returns {string} Nombre de la aplicación
 */
export function getAppName() {
  // Intentar obtener desde meta tag
  const metaName = document.querySelector('meta[name="application-name"]')?.getAttribute('content');
  if (metaName) return metaName;
  
  // Intentar obtener desde variable global
  if (typeof window !== 'undefined' && window.__APP_NAME__) {
    return window.__APP_NAME__;
  }
  
  // Valor por defecto
  return 'Studia';
}