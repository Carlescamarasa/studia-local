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
/**
 * Determina si el target del evento es un campo editable donde
 * el usuario puede estar escribiendo. Los hotkeys globales no deben
 * activarse cuando el usuario está editando texto.
 * 
 * @param {EventTarget | null} target - El elemento target del evento
 * @returns {boolean} - true si es un campo editable, false en caso contrario
 */
export function isEditableTarget(target: EventTarget | null): boolean {
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
    const inputTarget = target as HTMLInputElement;
    const type = inputTarget.type?.toLowerCase();
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
/**
 * Verifica si se debe ignorar un hotkey porque el usuario está editando texto.
 * 
 * @param {KeyboardEvent} event - El evento de teclado
 * @returns {boolean} - true si se debe ignorar el hotkey, false si se debe procesar
 */
export function shouldIgnoreHotkey(event: KeyboardEvent): boolean {
  return isEditableTarget(event.target);
}

/**
 * Formatea un shortcut para mostrar en la UI
 * Ejemplo: "mod+alt+s" → "Ctrl ⌥ S" (Mac) o "Ctrl+Alt+S" (Windows/Linux)
 * 
 * NOTA: En Mac, para los atajos propios de Studia usamos Ctrl+⌥ en lugar de ⌘+⌥
 * La única excepción es feedback-submit que usa ⌘+Enter
 * 
 * @param {string} combo - Combinación de teclas en formato "mod+alt+s"
 * @param {boolean} useCmdOnMac - Si es true, usa ⌘ en Mac (solo para feedback-submit)
 * @returns {string} - Combinación formateada para mostrar
 */
export function formatShortcut(combo: string, useCmdOnMac = false): string {
  const parts = combo.split('+').map(p => p.trim());
  const hasAlt = parts.includes('alt');
  const formatted = parts.map(p => {
    if (p === 'mod') {
      // En Mac, para atajos propios de Studia usamos Ctrl en lugar de ⌘
      // Excepto si useCmdOnMac es true (solo para feedback-submit)
      if (isMac && useCmdOnMac) {
        return '⌘';
      }
      // En Mac y Windows/Linux, mostramos "Ctrl" para los atajos propios de Studia
      return 'Ctrl';
    }
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
 * NOTA: En Mac, para los atajos propios de Studia usamos Ctrl+⌥ en lugar de ⌘+⌥
 * La única excepción es feedback-submit que usa ⌘+Enter
 * 
 * @param {KeyboardEvent} event - El evento de teclado
 * @param {string} combo - Combinación de teclas en formato "mod+alt+s"
 * @param {boolean} useCmdOnMac - Si es true, usa ⌘ en Mac (solo para feedback-submit)
 * @returns {boolean} - true si el evento coincide con la combinación
 */
export function matchesCombo(event: KeyboardEvent, combo: string, useCmdOnMac = false): boolean {
  const parts = combo.split('+').map(p => p.trim().toLowerCase());
  const key = event.key?.toLowerCase();
  const code = event.code?.toLowerCase();

  // Verificar mod
  // En Mac: para atajos propios de Studia usamos Ctrl, excepto si useCmdOnMac es true
  // En Windows/Linux: siempre usamos Ctrl
  const needsMod = parts.includes('mod');
  const needsAlt = parts.includes('alt');

  // Usar getModifierState como alternativa más confiable en algunos navegadores
  const hasCtrl = event.ctrlKey || (event.getModifierState && event.getModifierState('Control'));
  const hasMeta = event.metaKey || (event.getModifierState && event.getModifierState('Meta'));
  const hasAlt = event.altKey || (event.getModifierState && event.getModifierState('Alt'));
  const hasShift = event.shiftKey || (event.getModifierState && event.getModifierState('Shift'));


  if (needsMod) {
    if (isMac && useCmdOnMac) {
      // Caso especial: feedback-submit usa ⌘ en Mac
      if (!hasMeta) return false;
      // No debe haber Ctrl presionado
      if (hasCtrl) return false;
    } else if (isMac && needsAlt) {
      // En Mac, para mod+alt SOLO aceptamos Ctrl+Alt (Control+Option)
      // NO aceptamos Cmd+Alt porque queremos priorizar Control
      if (!hasCtrl) return false;
      // Rechazamos si hay Meta (Cmd) presionado
      if (hasMeta) return false;
    } else if (isMac) {
      // En Mac, para mod sin alt también usamos Ctrl (no Cmd)
      // Solo aceptamos Ctrl, no Meta
      if (!hasCtrl) return false;
      // Rechazamos si hay Meta (Cmd) presionado
      if (hasMeta) return false;
    } else {
      // Windows/Linux: siempre Ctrl
      if (!hasCtrl) return false;
      // No debe haber Cmd presionado (aunque no debería haber en Windows/Linux)
      if (hasMeta) return false;
    }
  } else {
    // Si no necesita mod, no debe haber ni Ctrl ni Cmd
    if (hasCtrl || hasMeta) return false;
  }

  // Verificar alt
  if (needsAlt !== hasAlt) return false;

  // Verificar la tecla principal (antes de verificar shift, porque "?" y "/" pueden necesitar shift pero no tenerlo en el combo)
  const mainKey = parts.find(p => !['mod', 'alt', 'shift'].includes(p));
  if (!mainKey) return false;

  // Extraer codeKey temprano para usarlo en los casos especiales
  // code tiene formato "KeyM", "KeyE", etc. - extraer la letra
  let codeKey = null;
  if (code && code.startsWith('Key')) {
    codeKey = code.substring(3).toLowerCase();
  } else if (code && code.startsWith('Digit')) {
    codeKey = code.substring(5);
  }

  // Manejo especial para '?' - se genera con Shift+/, así que requiere Shift pero lo capturamos como '?' simple
  // DEBE estar ANTES de la verificación general de shift
  if (mainKey === '?' && !needsMod && !needsAlt) {
    // Verificar que sea '?' (que viene de Shift+/) y que Shift esté presionado
    // Pero que NO haya otros modificadores
    if (key === '?' || (key === '/' && hasShift)) {
      // Asegurar que no haya otros modificadores no deseados, pero Shift sí es requerido para '?'
      return !hasCtrl && !hasMeta && !hasAlt && hasShift;
    }
    return false;
  }

  // Manejo especial para '/' con mod (mod+/) - DEBE estar ANTES de la verificación general de shift
  // En algunos teclados, '/' se genera con Shift+7, así que también aceptamos eso
  if (mainKey === '/' && needsMod && !needsAlt) {
    // Verificar que sea '/' o que sea '7' con Shift (Shift+7 produce '/')
    const isSlash = key === '/' || code === 'slash' || code === 'numpaddivide' || codeKey === '/';
    const isShift7 = (key === '7' || code === 'Digit7') && hasShift && !hasAlt;

    if (isSlash || isShift7) {
      // Para Shift+7, necesitamos Shift, pero para '/' directo no
      if (isShift7) {
        // Shift+7: necesita Shift pero no otros modificadores excepto mod
        // Ya verificamos mod arriba, solo falta verificar que no haya Alt
        return !hasAlt;
      } else {
        // '/' directo: no necesita Shift ni Alt
        return !hasAlt && !hasShift;
      }
    }
    return false;
  }

  // Verificar shift (después de la lógica especial de "?" y "/")
  const needsShift = parts.includes('shift');
  if (needsShift !== hasShift) return false;

  // Mapeo de teclas especiales
  const keyMap: Record<string, string> = {
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

  // Mapeo de caracteres especiales producidos por Alt en Mac a sus teclas base
  // En Mac, Alt+M produce µ, Alt+E produce €, etc.
  const macAltCharMap: Record<string, string> = {
    'µ': 'm',  // Alt+M
    '€': 'e',  // Alt+E
    '§': 's',  // Alt+S
    '¶': 'p',  // Alt+P
    '®': 'r',  // Alt+R
    '™': 't',  // Alt+T
    '©': 'c',  // Alt+C
    '∞': 'o',  // Alt+O
    '≈': 'x',  // Alt+X
    '÷': '/',  // Alt+/
    '≠': '=',  // Alt+=
    '≤': '<',  // Alt+<
    '≥': '>',  // Alt+>
    '∑': 'w',  // Alt+W
    '∏': 'p',  // Alt+P
    'π': 'p',  // Alt+P (alternativo)
    'Ω': 'z',  // Alt+Z
    'å': 'a',  // Alt+A
    'ß': 's',  // Alt+S (alternativo)
    '∂': 'd',  // Alt+D
    'ƒ': 'f',  // Alt+F
    '∆': 'j',  // Alt+J
    '√': 'v',  // Alt+V
    '∫': 'i',  // Alt+I
    'ª': 'a',  // Alt+A (alternativo)
    'º': 'o',  // Alt+O (alternativo)
    '¬': 'l',  // Alt+L
    'œ': 'q',  // Alt+Q
    'Œ': 'q',  // Alt+Q (mayúscula)
    '~': 'n',  // Alt+N (puede variar según teclado)
    'ñ': 'n',  // Alt+N (en algunos teclados)
    'Ñ': 'n',  // Alt+N (mayúscula)
  };

  // Normalizar tecla principal
  const normalizedMainKey = keyMap[mainKey] || mainKey;

  // Normalizar tecla del evento
  // Si estamos en Mac y hay Alt presionado, puede que key sea un carácter especial
  // En ese caso, intentamos mapearlo o usar code
  let normalizedEventKey = key && (keyMap[key] || key);

  // Si key es un carácter especial de Alt en Mac, mapearlo a la tecla base
  if (isMac && hasAlt && key && macAltCharMap[key]) {
    normalizedEventKey = macAltCharMap[key];
  }

  // Comparar la tecla principal con la tecla del evento
  // codeKey ya fue extraído arriba para los casos especiales
  // PRIORIZAR codeKey porque siempre es la tecla física (más confiable en Mac con Alt)
  // key puede ser un carácter especial en Mac con Alt, pero code siempre es correcto
  let keyMatches = false;
  let codeMatches = false;

  // Primero intentar con codeKey (más confiable, especialmente en Mac con Alt)
  // codeKey siempre es la tecla física, así que comparamos directamente con mainKey
  if (codeKey) {
    // codeKey es la letra física (ej: 't', 'q', 'l', 'n')
    // mainKey es lo que esperamos (ej: 't', 'q', 'l', 'n')
    codeMatches = (mainKey.toLowerCase() === codeKey);
  }

  // Luego intentar con key normalizado (por si codeKey no está disponible)
  if (!codeMatches) {
    // normalizedEventKey ya tiene el mapeo de caracteres especiales aplicado
    keyMatches = (normalizedMainKey === normalizedEventKey || mainKey === normalizedEventKey);
  }


  // Para teclas simples (una sola letra, número o '/' sin modificadores especiales)
  if (mainKey.length === 1 && !needsMod && !needsAlt && !needsShift && mainKey !== '?' && mainKey !== '/') {
    // Comparar directamente
    if (mainKey === key) {
      // Asegurar que no haya modificadores no deseados (incluyendo Shift para teclas normales)
      return !hasCtrl && !hasMeta && !hasAlt && !hasShift;
    }
  }

  // Para todas las demás teclas, verificar si hay match
  if (!keyMatches && !codeMatches) {
    return false;
  }

  // Si llegamos aquí, la tecla coincide (keyMatches o codeMatches)
  // Ya verificamos los modificadores arriba, así que retornamos true
  return true;
}

/**
 * Configuración única de hotkeys siguiendo normas de diseño:
 * - 1 acción = 1 atajo principal (primary)
 * - Opcionalmente 1 alias si hay razón muy buena
 * - En Mac: usar Ctrl+⌥ para atajos propios de Studia (no ⌘)
 * - Excepción: feedback-submit usa ⌘+Enter en Mac
 * 
 * Formato:
 * - id: identificador único
 * - scope: "global" | "study" | "feedback" | "create"
 * - primary: combinación principal en formato "mod+alt+s"
 * - aliases: array opcional con máximo 1 alias (ej: ["arrowright"])
 * - description: descripción para mostrar en el modal de ayuda
 * - roles: array de roles que pueden usar este hotkey (["ESTU", "PROF", "ADMIN"])
 * - useCmdOnMac: opcional, si es true usa ⌘ en Mac (solo para feedback-submit)
 */
export const HOTKEYS_CONFIG = [
  // Navegación general
  {
    id: 'toggle-sidebar',
    scope: 'global',
    primary: 'mod+alt+m',
    aliases: [],
    description: 'Abrir/cerrar menú lateral',
    roles: ['ESTU', 'PROF', 'ADMIN'],
  },
  {
    id: 'toggle-theme',
    scope: 'global',
    primary: 'mod+alt+t',
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
    primary: 'mod+alt+w',
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
    primary: 'mod+alt+q',
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
    description: 'Ir a Biblioteca',
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
  // Crear elementos - patrón: mod+alt+n
  {
    id: 'create-new',
    scope: 'create',
    primary: 'mod+alt+n',
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
    useCmdOnMac: true, // Excepción: usa ⌘+Enter en Mac
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
export function getHotkeyCombos(hotkey: any): string[] {
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
export function matchesHotkey(event: KeyboardEvent, hotkey: any): boolean {
  if (!hotkey) return false;
  const combos = getHotkeyCombos(hotkey);
  const useCmdOnMac = hotkey.useCmdOnMac || false;
  return combos.some(combo => matchesCombo(event, combo, useCmdOnMac));
}

/**
 * Obtiene los hotkeys visibles para un rol específico
 * 
 * @param {string} role - Rol del usuario ('ESTU', 'PROF', 'ADMIN')
 * @param {string} scope - Scope del hotkey ('global', 'study', 'feedback', 'create')
 * @returns {Array} - Array de hotkeys filtrados
 */
export function getHotkeysForRole(role: string, scope = 'global'): typeof HOTKEYS_CONFIG {
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
export function getHotkeyById(id: string) {
  return HOTKEYS_CONFIG.find(hk => hk.id === id) || null;
}

