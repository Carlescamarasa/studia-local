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
    if (p === '/') return '/';
    if (p === '?') return '?';
    // Números
    if (/^\d$/.test(p)) return p;
    // Letras simples
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
    'space': 'space',
    '/': '/',
    '?': '?',
  };

  // Normalizar tecla principal
  const normalizedMainKey = keyMap[mainKey] || mainKey;
  
  // Normalizar tecla del evento
  const normalizedEventKey = keyMap[key] || key;
  
  // Manejo especial para '/' con mod (mod+/)
  if (mainKey === '/' && needsMod && !needsAlt && !needsShift) {
    // Verificar que sea '/' y que mod esté presionado (sin otros modificadores)
    if (key === '/' || code === 'slash' || code === 'numpaddivide') {
      // Verificar que no haya otros modificadores no deseados
      return !event.altKey && !event.shiftKey;
    }
    return false;
  }
  
  // Manejo especial para '?' - se genera con Shift+/, así que requiere Shift pero lo capturamos como '?' simple
  if (mainKey === '?' && !needsMod && !needsAlt && !needsShift) {
    // Verificar que sea '?' (que viene de Shift+/) y que Shift esté presionado
    // Pero que NO haya otros modificadores
    if (key === '?' || (key === '/' && event.shiftKey)) {
      // Asegurar que no haya otros modificadores no deseados, pero Shift sí es requerido para '?'
      return !event.ctrlKey && !event.metaKey && !event.altKey && event.shiftKey;
    }
    return false;
  }
  
  // Para teclas simples (una sola letra, número o '/' sin modificadores especiales)
  if (mainKey.length === 1 && !needsMod && !needsAlt && !needsShift && mainKey !== '?' && mainKey !== '/') {
    // Comparar directamente
    if (mainKey === key) {
      // Asegurar que no haya modificadores no deseados (incluyendo Shift para teclas normales)
      return !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey;
    }
  }

  // Comparar teclas normalizadas (para teclas especiales como arrows, escape, etc.)
  return normalizedMainKey === normalizedEventKey || mainKey === key;
}

/**
 * Configuración única de hotkeys siguiendo normas de diseño:
 * - 1 acción = 1 atajo principal (primary)
 * - Opcionalmente 1 alias si hay razón muy buena
 * - Usar 'mod' para unificar ⌘/Ctrl (no duplicar por plataforma)
 * 
 * Formato:
 * - id: identificador único
 * - scope: "global" | "study" | "feedback" | "create"
 * - primary: combinación principal en formato "mod+alt+s"
 * - aliases: array opcional con máximo 1 alias (ej: ["arrowright"])
 * - description: descripción para mostrar en el modal de ayuda
 * - roles: array de roles que pueden usar este hotkey (["ESTU", "PROF", "ADMIN"])
 */
export const HOTKEYS_CONFIG = [
  // Navegación general
  {
    id: 'toggle-sidebar',
    scope: 'global',
    primary: 'mod+m',
    aliases: [],
    description: 'Abrir/cerrar menú lateral',
    roles: ['ESTU', 'PROF', 'ADMIN'],
  },
  {
    id: 'toggle-theme',
    scope: 'global',
    primary: 'mod+shift+d',
    aliases: [],
    description: 'Alternar tema claro/oscuro',
    roles: ['ESTU', 'PROF', 'ADMIN'],
  },
  {
    id: 'toggle-hotkeys-modal',
    scope: 'global',
    primary: 'mod+/',
    aliases: ['?'],
    description: 'Mostrar/ocultar panel de atajos de teclado',
    roles: ['ESTU', 'PROF', 'ADMIN'],
  },
  {
    id: 'logout',
    scope: 'global',
    primary: 'mod+alt+l',
    aliases: [],
    description: 'Cerrar sesión',
    roles: ['ESTU', 'PROF', 'ADMIN'],
  },
  // Navegación principal (ESTU) - patrón: mod+alt+<letra>
  {
    id: 'go-studia',
    scope: 'global',
    primary: 'mod+alt+s',
    aliases: [],
    description: 'Ir a Studia ahora',
    roles: ['ESTU'],
  },
  {
    id: 'go-week',
    scope: 'global',
    primary: 'mod+alt+m',
    aliases: [],
    description: 'Ir a Mi Semana',
    roles: ['ESTU'],
  },
  {
    id: 'go-stats-estu',
    scope: 'global',
    primary: 'mod+alt+e',
    aliases: [],
    description: 'Ir a Mis Estadísticas',
    roles: ['ESTU'],
  },
  {
    id: 'go-calendar-estu',
    scope: 'global',
    primary: 'mod+alt+c',
    aliases: [],
    description: 'Ir a Calendario',
    roles: ['ESTU'],
  },
  {
    id: 'go-support',
    scope: 'global',
    primary: 'mod+alt+h',
    aliases: [],
    description: 'Ir a Centro de dudas',
    roles: ['ESTU'],
  },
  // Navegación principal (PROF/ADMIN) - patrón: mod+alt+<letra>
  {
    id: 'go-assignments',
    scope: 'global',
    primary: 'mod+alt+a',
    aliases: [],
    description: 'Ir a Asignaciones',
    roles: ['PROF', 'ADMIN'],
  },
  {
    id: 'go-agenda',
    scope: 'global',
    primary: 'mod+alt+g',
    aliases: [],
    description: 'Ir a Agenda',
    roles: ['PROF', 'ADMIN'],
  },
  {
    id: 'go-templates',
    scope: 'global',
    primary: 'mod+alt+p',
    aliases: [],
    description: 'Ir a Plantillas',
    roles: ['PROF', 'ADMIN'],
  },
  {
    id: 'go-stats-prof',
    scope: 'global',
    primary: 'mod+alt+e',
    aliases: [],
    description: 'Ir a Estadísticas',
    roles: ['PROF', 'ADMIN'],
  },
  {
    id: 'go-calendar-prof',
    scope: 'global',
    primary: 'mod+alt+c',
    aliases: [],
    description: 'Ir a Calendario',
    roles: ['PROF', 'ADMIN'],
  },
  // Navegación principal (ADMIN) - patrón: mod+alt+<letra>
  {
    id: 'go-users',
    scope: 'global',
    primary: 'mod+alt+u',
    aliases: [],
    description: 'Ir a Usuarios',
    roles: ['ADMIN'],
  },
  {
    id: 'go-import',
    scope: 'global',
    primary: 'mod+alt+i',
    aliases: [],
    description: 'Ir a Importar y Exportar',
    roles: ['ADMIN'],
  },
  {
    id: 'go-design',
    scope: 'global',
    primary: 'mod+alt+o',
    aliases: [],
    description: 'Ir a Panel de Diseño',
    roles: ['ADMIN'],
  },
  // Crear elementos - patrón: mod+n (no mod+alt+n)
  {
    id: 'create-new',
    scope: 'create',
    primary: 'mod+n',
    aliases: [],
    description: 'Crear nuevo elemento (contextual según la página)',
    roles: ['ESTU', 'PROF', 'ADMIN'],
  },
  // Modo estudio (ESTU) - sin modificadores cuando sea posible
  {
    id: 'study-prev-exercise',
    scope: 'study',
    primary: 'arrowleft',
    aliases: [],
    description: 'Ejercicio anterior',
    roles: ['ESTU'],
  },
  {
    id: 'study-next-exercise',
    scope: 'study',
    primary: 'arrowright',
    aliases: [],
    description: 'Siguiente ejercicio',
    roles: ['ESTU'],
  },
  {
    id: 'study-play-pause',
    scope: 'study',
    primary: 'space',
    aliases: [],
    description: 'Pausar/reanudar audio',
    roles: ['ESTU'],
  },
  {
    id: 'study-mark-ok',
    scope: 'study',
    primary: 'enter',
    aliases: [],
    description: 'Marcar ejercicio como completado (OK)',
    roles: ['ESTU'],
  },
  {
    id: 'study-toggle-index',
    scope: 'study',
    primary: 'i',
    aliases: [],
    description: 'Mostrar/ocultar índice de ejercicios',
    roles: ['ESTU'],
  },
  {
    id: 'study-exit-session',
    scope: 'study',
    primary: 'escape',
    aliases: [],
    description: 'Abrir diálogo de salir de la sesión',
    roles: ['ESTU'],
  },
  // Feedback de sesión (ESTU)
  {
    id: 'feedback-very-difficult',
    scope: 'feedback',
    primary: '1',
    aliases: [],
    description: 'Valoración: Muy difícil',
    roles: ['ESTU'],
  },
  {
    id: 'feedback-difficult',
    scope: 'feedback',
    primary: '2',
    aliases: [],
    description: 'Valoración: Difícil',
    roles: ['ESTU'],
  },
  {
    id: 'feedback-good',
    scope: 'feedback',
    primary: '3',
    aliases: [],
    description: 'Valoración: Bien',
    roles: ['ESTU'],
  },
  {
    id: 'feedback-excellent',
    scope: 'feedback',
    primary: '4',
    aliases: [],
    description: 'Valoración: Excelente',
    roles: ['ESTU'],
  },
  {
    id: 'feedback-submit',
    scope: 'feedback',
    primary: 'mod+enter',
    aliases: [],
    description: 'Finalizar sesión (enviar feedback)',
    roles: ['ESTU'],
  },
  {
    id: 'feedback-close',
    scope: 'feedback',
    primary: 'escape',
    aliases: [],
    description: 'Cerrar modal de feedback',
    roles: ['ESTU'],
  },
];

/**
 * Obtiene todas las combinaciones válidas para un hotkey (primary + aliases)
 * 
 * @param {Object} hotkey - Objeto de configuración del hotkey
 * @returns {Array<string>} - Array de combinaciones válidas
 */
export function getHotkeyCombos(hotkey) {
  if (!hotkey) return [];
  const combos = [hotkey.primary];
  if (hotkey.aliases && Array.isArray(hotkey.aliases)) {
    combos.push(...hotkey.aliases);
  }
  return combos;
}

/**
 * Verifica si un evento de teclado coincide con un hotkey (primary o aliases)
 * 
 * @param {KeyboardEvent} event - El evento de teclado
 * @param {Object} hotkey - Objeto de configuración del hotkey
 * @returns {boolean} - true si el evento coincide con el hotkey
 */
export function matchesHotkey(event, hotkey) {
  if (!hotkey) return false;
  const combos = getHotkeyCombos(hotkey);
  return combos.some(combo => matchesCombo(event, combo));
}

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
