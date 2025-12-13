import { localUsers } from "@/local-data/localUsers";
import { getCurrentUser } from "@/api/localDataClient";
import { useAuth } from "@/auth/AuthProvider";
import { useLocalData } from "@/local-data/LocalDataProvider";

/**
 * Obtiene el nombre visible de un usuario según la jerarquía:
 * 1. full_name (fuente de verdad en profiles)
 * 2. nombreCompleto (campo derivado, fallback)
 * 3. first_name + last_name
 * 4. name
 * 5. email (parte local antes de @)
 * 6. "Sin nombre" (fallback final)
 */
export function displayName(u) {
  if (!u) return 'Sin nombre';

  // Prioridad 1: full_name (fuente de verdad en profiles)
  if (u.full_name && u.full_name.trim()) {
    return u.full_name.trim();
  }

  // Prioridad 2: nombreCompleto (campo derivado, fallback)
  if (u.nombreCompleto && u.nombreCompleto.trim()) {
    return u.nombreCompleto.trim();
  }

  // Prioridad 3: first_name + last_name
  const combined = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
  if (combined) return combined;

  // Prioridad 4: name genérico
  if (u.name && u.name.trim()) {
    return u.name.trim();
  }

  // Si tenemos solo el id, intentar resolver por ID
  if (u.id) {
    const byId = displayNameById(u.id);
    if (byId && byId !== 'Sin nombre') return byId;
  }

  // Prioridad 5: email (parte local o completo si la parte local es un ID)
  if (u.email) {
    const email = String(u.email);
    if (email.includes('@')) {
      const parteLocal = email.split('@')[0];
      // Evitar IDs tipo Mongo/ObjectId (24 hex) u otros ids crudos
      const isLikelyId = /^[a-f0-9]{24}$/i.test(parteLocal) || /^u_[a-z0-9_]+$/i.test(parteLocal);
      if (parteLocal && !isLikelyId) {
        // Formatear email: "nombre.apellido" o "nombre" de forma más legible
        const formatted = parteLocal
          .replace(/[._+-]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase())
          .trim();
        return formatted || parteLocal; // Si después de formatear queda vacío, usar parte local
      }
      // Si la parte local parece un ID, usar el email completo
      return email;
    }
    // Si no tiene @, usar el email tal cual
    return email;
  }

  return 'Sin nombre';
}

// Alias para compatibilidad con código existente
export const getNombreVisible = displayName;

/**
 * Obtiene nombre visible por ID buscando en localUsers como fallback local.
 */
export function displayNameById(userId) {
  if (!userId) return 'Sin nombre';
  const user = Array.isArray(localUsers) ? localUsers.find(u => u.id === userId) : null;
  if (user) return displayName(user);
  // Fallback explícito para IDs conocidos en local
  if (userId === '6913f9c07890d136d35d0a77') return 'Carles Estudiante';
  if (userId === '77dcf831-6283-462a-83bd-f5c46b3cde28') return 'La Trompeta Sonará'; // Supabase UUID
  return 'Sin nombre';
}

/**
 * Formatea minutos a cadena humana: "9 h 42 min" u "42 min" si < 1h
 * Si las horas son >= 24, muestra formato "D d H h M min"
 */
export function formatDurationMinutes(totalMinutes) {
  const minutes = Math.max(0, Math.floor(totalMinutes || 0));
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;

  // Si las horas son >= 24, mostrar formato con días
  if (hours >= 24) {
    const dias = Math.floor(hours / 24);
    const horasRestantes = hours % 24;
    if (dias > 0 && horasRestantes > 0 && rem > 0) {
      return `${dias} d ${horasRestantes} h ${rem} min`;
    }
    if (dias > 0 && horasRestantes > 0) {
      return `${dias} d ${horasRestantes} h`;
    }
    if (dias > 0 && rem > 0) {
      return `${dias} d ${rem} min`;
    }
    if (dias > 0) {
      return `${dias} d`;
    }
  }

  // Formato normal para < 24h
  if (hours <= 0) {
    return `${rem} min`;
  }
  return `${hours} h ${rem} min`;
}

/**
 * Normaliza texto para búsquedas (minúsculas, sin espacios extras)
 */
export function normalizarTexto(str) {
  if (!str) return '';
  return str.toLowerCase().trim();
}

// --- Helpers de fechas locales (sin UTC, sin saltos DST) ---
const pad2 = (n) => String(n).padStart(2, "0");

export const formatLocalDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const parseLocalDate = (s) => {
  if (!s || typeof s !== 'string') {
    throw new Error('parseLocalDate: Invalid input');
  }
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const startOfMonday = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
};

export const isoWeekNumberLocal = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
};

/**
 * Calcula el lunes de la semana ISO para una fecha dada (versión local, sin UTC)
 */
export function calcularLunesSemanaISO(fecha) {
  if (typeof fecha === 'string') {
    const d = parseLocalDate(fecha);
    return formatLocalDate(startOfMonday(d));
  } else {
    return formatLocalDate(startOfMonday(fecha));
  }
}

/**
 * Calcula el offset de semanas entre dos fechas ISO (versión local)
 */
export function calcularOffsetSemanas(semanaInicioISO, semanaActualISO) {
  const inicio = parseLocalDate(semanaInicioISO);
  const actual = parseLocalDate(semanaActualISO);
  const diffTime = actual - inicio;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return Math.floor(diffDays / 7);
}

/**
 * Calcula el tiempo total de una sesión (ejercicios + rondas, excluyendo AD)
 */
export function calcularTiempoSesion(sesion) {
  if (!sesion || !sesion.bloques) return 0;

  const tiempoEjercicios = sesion.bloques
    .filter(b => b.tipo !== 'AD')
    .reduce((total, b) => total + (b.duracionSeg || 0), 0);

  const tiempoRondas = (sesion.rondas || []).reduce((total, ronda) => {
    const tiempoRonda = ronda.bloques.reduce((sum, code) => {
      const bloque = sesion.bloques.find(b => b.code === code);
      if (bloque && bloque.tipo !== 'AD') {
        return sum + (bloque.duracionSeg || 0);
      }
      return sum;
    }, 0);
    return total + (tiempoRonda * ronda.repeticiones);
  }, 0);

  return tiempoEjercicios + tiempoRondas;
}

/**
 * Aplana las rondas de una sesión en una lista de ejecución secuencial
 */
export function aplanarSesion(sesion) {
  if (!sesion || !sesion.bloques) return [];

  const listaEjecucion = [];

  // Primero añadir ejercicios normales (no en rondas)
  const codigosEnRondas = new Set();
  (sesion.rondas || []).forEach(ronda => {
    ronda.bloques.forEach(code => codigosEnRondas.add(code));
  });

  sesion.bloques.forEach((ejercicio, idx) => {
    if (!codigosEnRondas.has(ejercicio.code)) {
      listaEjecucion.push({
        ...ejercicio,
        indiceOriginal: idx,
        esRonda: false,
      });
    }
  });

  // Luego añadir rondas aplanadas
  (sesion.rondas || []).forEach((ronda, rondaIdx) => {
    for (let rep = 0; rep < ronda.repeticiones; rep++) {
      ronda.bloques.forEach((code) => {
        const ejercicio = sesion.bloques.find(b => b.code === code);
        if (ejercicio) {
          listaEjecucion.push({
            ...ejercicio,
            esRonda: true,
            rondaIdx,
            repeticion: rep + 1,
            totalRepeticiones: ronda.repeticiones,
          });
        }
      });
    }
  });

  return listaEjecucion;
}

/**
 * Función unificada para obtener el rol efectivo del usuario.
 * Funciona tanto en modo local como con Supabase.
 * 
 * @param {Object} options - Opciones para obtener el rol
 * @param {string} options.appRole - Rol desde useAuth() (Supabase)
 * @param {Object} options.currentUser - Usuario desde getCurrentUser() (local)
 * @returns {string} - Rol efectivo: 'ADMIN', 'PROF' o 'ESTU'
 */
export function getEffectiveRole(options = {}) {
  const { appRole, currentUser } = options;

  // Priorizar appRole (modo Supabase) sobre currentUser (modo local)
  // En modo Supabase: usar appRole
  if (appRole) {
    return appRole;
  }

  // En modo local puro (sin Supabase): usar currentUser
  if (currentUser?.rolPersonalizado) {
    return currentUser.rolPersonalizado;
  }

  // Fallback: intentar obtener desde getCurrentUser() si no se pasó
  if (!currentUser && !appRole) {
    try {
      const localUser = getCurrentUser();
      if (localUser?.rolPersonalizado) {
        return localUser.rolPersonalizado;
      }
    } catch (e) {
      // Ignorar errores
    }
  }

  // Fallback final
  return "ESTU";
}

/**
 * Hook que obtiene el usuario efectivo que funciona en ambos modos (local y Supabase).
 * 
 * En modo Supabase: Busca el usuario en datos locales por email del usuario de Supabase.
 * Si no se encuentra, crea un usuario sintético basado en la información de Supabase.
 * En modo local: Usa getCurrentUser() directamente.
 * 
 * @returns {Object|null} - Usuario efectivo con todas sus propiedades (id, rolPersonalizado, email, etc.) o null si no se encuentra
 */
export function useEffectiveUser() {
  const { user: supabaseUser, appRole } = useAuth();
  const currentUser = getCurrentUser();
  const { usuarios, loading: dataLoading } = useLocalData();

  // Si hay usuario de Supabase, SIEMPRE usar el ID de Supabase (UUID)
  // No buscar en datos locales por email porque puede devolver un usuario con ID legacy
  // que rompe la integridad referencial con Supabase.
  if (supabaseUser?.email && appRole) {
    // Extraer nombre del email o usar metadata de Supabase
    const emailParts = supabaseUser.email.split('@')[0];
    const metadata = supabaseUser.user_metadata || {};
    const fullName = metadata.full_name || metadata.name || emailParts;
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] || emailParts;
    const lastName = nameParts.slice(1).join(' ') || '';

    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      rolPersonalizado: appRole,
      nombreCompleto: fullName,
      full_name: fullName,
      first_name: firstName,
      last_name: lastName,
      name: fullName,
      estado: 'activo',
      fechaRegistro: supabaseUser.created_at || new Date().toISOString(),
      // Añadir metadata adicional si existe
      ...(metadata.avatar_url && { avatar_url: metadata.avatar_url }),
      ...(metadata.nivel_tecnico && { nivelTecnico: metadata.nivel_tecnico }),
      ...(metadata.nivelTecnico && { nivelTecnico: metadata.nivelTecnico }),
    };
  }

  // Si no hay appRole aún (Supabase auth en progreso), retornar null temporalmente
  if (supabaseUser?.email) {
    return null;
  }

  // En modo local (sin Supabase), usar currentUser directamente
  return currentUser;
}

/**
 * Resuelve el ID de usuario actual de la BD usando estrategia prioritaria:
 * 1. Buscar por ID (UUID en Supabase, string en local) - PRIORITARIO
 * 2. En modo local: fallback a email si ID no coincide
 * 
 * En modo Supabase: effectiveUser.id DEBE ser UUID de auth.users = profiles.id
 * En modo local: IDs pueden ser strings diferentes, usar email como fallback
 * 
 * @param {Object} effectiveUser - Usuario de useEffectiveUser()
 * @param {Array} usuarios - Lista de usuarios de User.list()
 * @returns {string|null} - ID del usuario en la BD, o null si no se puede resolver
 */
export function resolveUserIdActual(effectiveUser, usuarios = []) {
  if (!effectiveUser?.id) return null;

  // Estrategia 1: Buscar por ID directamente (prioritario)
  // En modo Supabase, effectiveUser.id es UUID de auth.users = profiles.id
  // En modo local, puede ser string, pero debe coincidir si existe
  const usuarioActual = usuarios.find(u => u.id === effectiveUser.id);
  if (usuarioActual) {
    return usuarioActual.id;
  }

  // Estrategia 2: Si no se encuentra y tenemos email, buscar por email
  // (En modo Supabase, email solo disponible para usuario autenticado)
  // (En modo local, email puede estar disponible para todos)
  if (effectiveUser.email) {
    const normalizedEmail = effectiveUser.email.toLowerCase().trim();
    const usuarioPorEmail = usuarios.find(u =>
      u.email && u.email.toLowerCase().trim() === normalizedEmail
    );
    if (usuarioPorEmail) {
      return usuarioPorEmail.id;
    }
  }

  // Fallback: usar effectiveUser.id directamente
  // En modo Supabase, esto DEBE ser el UUID correcto
  // En modo local, puede ser necesario usar este ID
  return effectiveUser.id;
}