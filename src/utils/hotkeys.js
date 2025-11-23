/**
 * Sistema centralizado de atajos de teclado (hotkeys)
 * 
 * Maneja:
 * - Hotkeys globales (navegación, acciones generales)
 * - Hotkeys contextuales (modo estudio, modales, etc.)
 * - Protección contra activación en campos editables
 */

/**
 * Determina si el target del evento es un campo editable donde
 * el usuario puede estar escribiendo. Los hotkeys globales no deben
 * activarse cuando el usuario está editando texto.
 * 
 * @param {EventTarget | null} target - El elemento target del evento
 * @returns {boolean} - true si es un campo editable, false en caso contrario
 */
export function isEditableTarget(target) {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }

  // Campos con contentEditable activo
  if (target.isContentEditable) {
    return true;
  }

  const tag = target.tagName;

  // Textareas siempre son editables
  if (tag === 'TEXTAREA') {
    return true;
  }

  // Inputs son editables excepto algunos tipos especiales
  if (tag === 'INPUT') {
    const type = target.type?.toLowerCase();
    // Estos tipos de input son editables:
    const editableTypes = ['text', 'email', 'password', 'search', 'tel', 'url', 'number'];
    // Los checkboxes, radio, button, submit, etc. NO son editables para escribir texto
    return editableTypes.includes(type);
  }

  // Elementos con role="textbox" son editables
  if (target.getAttribute('role') === 'textbox') {
    return true;
  }

  return false;
}

/**
 * Verifica si se debe ignorar un hotkey porque el usuario está editando texto.
 * 
 * @param {KeyboardEvent} event - El evento de teclado
 * @returns {boolean} - true si se debe ignorar el hotkey, false si se debe procesar
 */
export function shouldIgnoreHotkey(event) {
  return isEditableTarget(event.target);
}

/**
 * Registro centralizado de handlers de hotkeys
 * Permite suscribirse/desuscribirse dinámicamente para evitar fugas de eventos
 */
class HotkeyRegistry {
  constructor() {
    this.globalHandlers = [];
    this.contextualHandlers = [];
    this.isRegistered = false;
  }

  /**
   * Registra un handler global de hotkeys
   * @param {Function} handler - Función que recibe (event) y retorna true si procesó el evento
   */
  registerGlobal(handler) {
    this.globalHandlers.push(handler);
    if (!this.isRegistered) {
      this.setupGlobalListener();
    }
    return () => {
      this.globalHandlers = this.globalHandlers.filter(h => h !== handler);
    };
  }

  /**
   * Registra un handler contextual (solo activo en ciertas condiciones)
   * @param {Function} handler - Función que recibe (event) y retorna true si procesó el evento
   * @param {Function} isActive - Función que retorna true si el contexto está activo
   */
  registerContextual(handler, isActive) {
    const contextual = { handler, isActive };
    this.contextualHandlers.push(contextual);
    if (!this.isRegistered) {
      this.setupGlobalListener();
    }
    return () => {
      this.contextualHandlers = this.contextualHandlers.filter(h => h !== contextual);
    };
  }

  setupGlobalListener() {
    if (this.isRegistered) return;
    
    const handleKeyDown = (e) => {
      // Verificar campos editables primero
      if (shouldIgnoreHotkey(e)) {
        return;
      }

      // Procesar handlers contextuales primero (tienen prioridad)
      for (const { handler, isActive } of this.contextualHandlers) {
        if (isActive && isActive()) {
          if (handler(e)) {
            return; // Handler procesó el evento
          }
        }
      }

      // Procesar handlers globales
      for (const handler of this.globalHandlers) {
        if (handler(e)) {
          return; // Handler procesó el evento
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    this.isRegistered = true;
    
    // Cleanup cuando se desmonte (si es necesario)
    if (import.meta.env.DEV) {
      if (typeof window !== 'undefined' && !window.__hotkeyRegistryCleanup) {
        window.__hotkeyRegistryCleanup = () => {
          window.removeEventListener('keydown', handleKeyDown, true);
          this.isRegistered = false;
        };
      }
    }
  }
}

// Instancia singleton del registro
export const hotkeyRegistry = new HotkeyRegistry();

/**
 * Helper para crear handlers de navegación
 */
export function createNavigationHandler(navigate, path) {
  return (e) => {
    if ((e.ctrlKey || e.metaKey) && e.altKey) {
      // Se procesará en el handler específico
      return false;
    }
    return false;
  };
}
