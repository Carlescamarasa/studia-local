/**
 * Sistema centralizado de atajos de teclado (hotkeys)
 * 
 * Maneja:
 * - Hotkeys globales (navegación, acciones generales)
 * - Hotkeys contextuales (modo estudio, modales, etc.)
 * - Protección contra activación en campos editables
 * - Detección automática de Mac/Windows para mostrar símbolos correctos
 */

/**
 * Determina si el usuario está en Mac
 */
export const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

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
 * Formatea un shortcut para mostrar en la UI
 * Ejemplo: "mod+alt+s" → "⌘ ⌥ S" (Mac) o "Ctrl+Alt+S" (Windows/Linux)
 * 
 * @param {string} combo - Combinación de teclas en formato "mod+alt+s"
 * @returns {string} - Combinación formateada para mostrar
 */
export function formatShortcut(combo) {
  const parts = combo.split('+').map(p => p.trim());
  const formatted = parts.map(p => {
    if (p === 'mod') return isMac ? '⌘' : 'Ctrl';
    if (p === 'alt') return isMac ? '⌥' : 'Alt';
    if (p === 'shift') return isMac ? '⇧' : 'Shift';
    // Teclas especiales
    if (p === 'arrowleft') return '←';
    if (p === 'arrowright') return '→';
    if (p === 'arrowup') return '↑';
    if (p === 'arrowdown') return '↓';
    if (p === 'escape') return 'Esc';
    if (p === 'enter') return 'Enter';
    if (p === 'space') return 'Espacio';
    // Letras y números simples
    return p.length === 1 ? p.toUpperCase() : p;
  });
  
  // En Mac, añadir espacios entre símbolos para mejor legibilidad
  // En Windows/Linux, usar el separador "+"
  return isMac ? formatted.join(' ') : formatted.join('+');
}

/**
 * Verifica si un evento de teclado coincide con una combinación de teclas
 * 
 * @param {KeyboardEvent} event - El evento de teclado
 * @param {string} combo - Combinación de teclas en formato "mod+alt+s"
 * @returns {boolean} - true si el evento coincide con la combinación
 */
export function matchesCombo(event, combo) {
  const parts = combo.split('+').map(p => p.trim().toLowerCase());
  const key = event.key?.toLowerCase();
  const code = event.code?.toLowerCase();
  
  // Verificar mod (Ctrl en Windows/Linux, Cmd en Mac)
  const needsMod = parts.includes('mod');
  const hasMod = isMac ? event.metaKey : event.ctrlKey;
  if (needsMod && !hasMod) return false;
  if (!needsMod && (event.ctrlKey || event.metaKey)) return false;

  // Verificar alt
  const needsAlt = parts.includes('alt');
  if (needsAlt !== event.altKey) return false;

  // Verificar shift
  const needsShift = parts.includes('shift');
  if (needsShift !== event.shiftKey) return false;

  // Verificar la tecla principal
  const mainKey = parts.find(p => !['mod', 'alt', 'shift'].includes(p));
  if (!mainKey) return false;

  // Mapeo de teclas especiales
  const keyMap = {
    'arrowleft': 'arrowleft',
    'arrowright': 'arrowright',
    'arrowup': 'arrowup',
    'arrowdown': 'arrowdown',
    'escape': 'escape',
    'enter': 'enter',
    ' ': 'space',
  };

  const normalizedMainKey = keyMap[mainKey] || mainKey;
  const normalizedEventKey = keyMap[key] || key;
  const normalizedEventCode = code ? code.replace('key', '').toLowerCase() : null;

  // Comparar con key y code
  return normalizedMainKey === normalizedEventKey || 
         mainKey === key || 
         mainKey === normalizedEventCode;
}

/**
 * Configuración única de hotkeys
 * Cada entrada tiene:
 * - id: identificador único
 * - scope: "global" | "study" | "feedback" | "create"
 * - combos: array de combinaciones válidas (ej: ["mod+alt+s"])
 * - description: descripción para mostrar en el modal de ayuda
 * - roles: array de roles que pueden usar este hotkey (["ESTU", "PROF", "ADMIN"])
 * - action: función a ejecutar (se pasa context como parámetro)
 */
export const HOTKEYS_CONFIG = [
  // Navegación global
  {
    id: 'toggle-sidebar',
    scope: 'global',
    combos: ['mod+m'],
    description: 'Abrir/cerrar menú lateral',
    roles: ['ESTU', 'PROF', 'ADMIN'],
  },
  {
    id: 'toggle-theme',
    scope: 'global',
    combos: ['mod+shift+d'],
    description: 'Alternar tema claro/oscuro',
    roles: ['ESTU', 'PROF', 'ADMIN'],
  },
  {
    id: 'toggle-hotkeys-modal',
    scope: 'global',
    combos: ['mod+alt+k'],
    description: 'Mostrar/ocultar panel de atajos de teclado',
    roles: ['ESTU', 'PROF', 'ADMIN'],
  },
  {
    id: 'logout',
    scope: 'global',
    combos: ['mod+alt+l'],
    description: 'Cerrar sesión',
    roles: ['ESTU', 'PROF', 'ADMIN'],
  },
  // Navegación por rol (ESTU)
  {
    id: 'go-studia',
    scope: 'global',
    combos: ['mod+alt+s'],
    description: 'Ir a Studia ahora',
    roles: ['ESTU'],
  },
  {
    id: 'go-week',
    scope: 'global',
    combos: ['mod+alt+m'],
    description: 'Ir a Mi Semana',
    roles: ['ESTU'],
  },
  {
    id: 'go-stats-estu',
    scope: 'global',
    combos: ['mod+alt+e'],
    description: 'Ir a Mis Estadísticas',
    roles: ['ESTU'],
  },
  {
    id: 'go-calendar-estu',
    scope: 'global',
    combos: ['mod+alt+c'],
    description: 'Ir a Calendario',
    roles: ['ESTU'],
  },
  {
    id: 'go-support',
    scope: 'global',
    combos: ['mod+alt+d'],
    description: 'Ir a Centro de dudas',
    roles: ['ESTU'],
  },
  // Navegación por rol (PROF/ADMIN)
  {
    id: 'go-assignments',
    scope: 'global',
    combos: ['mod+alt+a'],
    description: 'Ir a Asignaciones',
    roles: ['PROF', 'ADMIN'],
  },
  {
    id: 'go-agenda',
    scope: 'global',
    combos: ['mod+alt+g'],
    description: 'Ir a Agenda',
    roles: ['PROF', 'ADMIN'],
  },
  {
    id: 'go-templates',
    scope: 'global',
    combos: ['mod+alt+p'],
    description: 'Ir a Plantillas',
    roles: ['PROF', 'ADMIN'],
  },
  {
    id: 'go-stats-prof',
    scope: 'global',
    combos: ['mod+alt+e'],
    description: 'Ir a Estadísticas',
    roles: ['PROF', 'ADMIN'],
  },
  {
    id: 'go-calendar-prof',
    scope: 'global',
    combos: ['mod+alt+c'],
    description: 'Ir a Calendario',
    roles: ['PROF', 'ADMIN'],
  },
  // Navegación por rol (ADMIN)
  {
    id: 'go-users',
    scope: 'global',
    combos: ['mod+alt+u'],
    description: 'Ir a Usuarios',
    roles: ['ADMIN'],
  },
  {
    id: 'go-import',
    scope: 'global',
    combos: ['mod+alt+i'],
    description: 'Ir a Importar y Exportar',
    roles: ['ADMIN'],
  },
  {
    id: 'go-design',
    scope: 'global',
    combos: ['mod+alt+o'],
    description: 'Ir a Panel de Diseño',
    roles: ['ADMIN'],
  },
  // Crear elementos (contextual)
  {
    id: 'create-new',
    scope: 'create',
    combos: ['mod+alt+n'],
    description: 'Crear nuevo elemento (contextual según la página)',
    roles: ['ESTU', 'PROF', 'ADMIN'],
  },
];

/**
 * Obtiene los hotkeys visibles para un rol específico
 * 
 * @param {string} role - Rol del usuario ('ESTU', 'PROF', 'ADMIN')
 * @param {string} scope - Scope del hotkey ('global', 'study', 'feedback', 'create')
 * @returns {Array} - Array de hotkeys filtrados
 */
export function getHotkeysForRole(role, scope = 'global') {
  return HOTKEYS_CONFIG.filter(hk => 
    hk.scope === scope && hk.roles.includes(role)
  );
}

/**
 * Busca un hotkey por su ID
 * 
 * @param {string} id - ID del hotkey
 * @returns {Object|null} - Configuración del hotkey o null si no se encuentra
 */
export function getHotkeyById(id) {
  return HOTKEYS_CONFIG.find(hk => hk.id === id) || null;
}
