/**
 * Utilidades centralizadas para atajos de teclado (hotkeys)
 * 
 * Maneja:
 * - Hotkeys globales (ej: Ctrl+Alt+S para "Studia ahora")
 * - Helper para detectar campos editables
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

