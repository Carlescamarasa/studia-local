/**
 * Utility functions for remote data handling
 */

import type { StudiaUser } from '@/shared/types/domain';

/**
 * Helper para convertir camelCase a snake_case
 * Maneja correctamente siglas como ISO, ID, etc.
 * Ejemplos:
 * - semanaInicioISO -> semana_inicio_iso
 * - userId -> user_id
 * - XMLHttpRequest -> xml_http_request
 */
export function toSnakeCase(str: string): string {
    // Procesar de derecha a izquierda para manejar siglas correctamente
    // Primero, separar siglas finales (secuencias de mayúsculas al final)
    // Ej: "semanaInicioISO" -> "semanaInicio_ISO"
    let result = str.replace(/([a-z])([A-Z]+)$/g, '$1_$2');

    // Luego, insertar _ antes de mayúsculas que siguen a minúsculas o números
    // Esto maneja casos como "semanaInicio" -> "semana_Inicio"
    result = result.replace(/([a-z0-9])([A-Z])/g, '$1_$2');

    // Insertar _ antes de mayúsculas que siguen a otras mayúsculas seguidas de minúsculas
    // (ej: "HTTP" seguido de "Request" en "HTTPRequest")
    result = result.replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2');

    // Convertir todo a minúsculas
    return result.toLowerCase();
}

/**
 * Helper para convertir snake_case a camelCase
 */
export function toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Normaliza campos ISO en objetos RegistroSesion y RegistroBloque
 * Convierte inicioIso → inicioISO y finIso → finISO
 */
export function normalizeISOFields<T>(obj: any): T {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => normalizeISOFields(item)) as T;
    }

    if (typeof obj !== 'object') {
        return obj;
    }

    const result: any = { ...obj };

    // Normalizar campos ISO específicos
    if ('inicioIso' in result && !('inicioISO' in result)) {
        result.inicioISO = result.inicioIso;
        delete result.inicioIso;
    }
    if ('finIso' in result && !('finISO' in result)) {
        result.finISO = result.finIso;
        delete result.finIso;
    }

    // Aplicar recursivamente a propiedades anidadas
    for (const key in result) {
        if (Object.prototype.hasOwnProperty.call(result, key) && typeof result[key] === 'object') {
            result[key] = normalizeISOFields(result[key]);
        }
    }

    return result as T;
}

/**
 * Normaliza campos ISO en objetos Asignacion y FeedbackSemanal
 * Convierte semanaInicioIso → semanaInicioISO
 */
export function normalizeAsignacionISO<T>(obj: any): T {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => normalizeAsignacionISO(item)) as T;
    }

    if (typeof obj !== 'object') {
        return obj;
    }

    const result: any = { ...obj };

    // Normalizar semanaInicioIso → semanaInicioISO
    if ('semanaInicioIso' in result && !('semanaInicioISO' in result)) {
        result.semanaInicioISO = result.semanaInicioIso;
        delete result.semanaInicioIso;
    }

    // Aplicar recursivamente a propiedades anidadas
    for (const key in result) {
        if (Object.prototype.hasOwnProperty.call(result, key) && typeof result[key] === 'object') {
            result[key] = normalizeAsignacionISO(result[key]);
        }
    }

    return result as T;
}

/**
 * Convierte un objeto de snake_case a camelCase recursivamente
 */
export function snakeToCamel<T>(obj: any): T {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => snakeToCamel(item)) as T;
    }

    if (typeof obj !== 'object') {
        return obj;
    }

    const result: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const camelKey = toCamelCase(key);
            result[camelKey] = snakeToCamel(obj[key]);
        }
    }
    return result as T;
}

/**
 * Convierte un objeto de camelCase a snake_case recursivamente
 */
export function camelToSnake(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => camelToSnake(item));
    }

    if (typeof obj !== 'object') {
        return obj;
    }

    const result: any = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const snakeKey = toSnakeCase(key);
            result[snakeKey] = camelToSnake(obj[key]);
        }
    }
    return result;
}





/**
 * Helper para deserializar campos JSON específicos después de leer de Supabase
 */
export function deserializeJsonFields(data: any, jsonFields: string[]): any {
    const result = { ...data };
    for (const field of jsonFields) {
        if (result[field] && typeof result[field] === 'string') {
            try {
                result[field] = JSON.parse(result[field]);
            } catch (e) {
                // Mantener como string si falla el parse
            }
        }
    }
    return result;
}

/**
 * Normaliza un usuario de Supabase para que tenga los campos esperados por el código
 * Mapea: role → rolPersonalizado, fullName → nombreCompleto, y normaliza nombreCompleto
 */
export function normalizeSupabaseUser(user: any, email?: string): any {
    if (!user) return user;

    // Después de snakeToCamel, los campos están en camelCase:
    // - role → role (no cambia porque no tiene guiones bajos)
    // - full_name → fullName
    // - profesor_asignado_id → profesorAsignadoId
    // - is_active → isActive

    // Mapear role → rolPersonalizado
    // El campo 'role' viene directamente de Supabase y no se modifica por snakeToCamel
    // Verificar tanto 'role' (directo de Supabase) como 'rolPersonalizado' (ya mapeado)
    const roleValue = user.role || user.rolPersonalizado;
    const rolPersonalizado = (roleValue && ['ADMIN', 'PROF', 'ESTU'].includes(roleValue.toUpperCase()))
        ? roleValue.toUpperCase()
        : 'ESTU';

    // Obtener full_name (puede estar como fullName o full_name después de snakeToCamel)
    const fullName = user.fullName || user.full_name || '';

    // Generar nombreCompleto desde full_name si está disponible
    let nombreCompleto = '';
    if (fullName && fullName.trim()) {
        nombreCompleto = fullName.trim();
    } else if (user.email) {
        // Intentar derivar del email
        const emailStr = String(user.email);
        if (emailStr.includes('@')) {
            const parteLocal = emailStr.split('@')[0];
            const isLikelyId = /^[a-f0-9]{24}$/i.test(parteLocal) || /^u_[a-z0-9_]+$/i.test(parteLocal);
            if (parteLocal && !isLikelyId) {
                nombreCompleto = parteLocal
                    .replace(/[._+-]/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase())
                    .trim() || emailStr;
            } else {
                nombreCompleto = emailStr;
            }
        } else {
            nombreCompleto = emailStr;
        }
    } else if (email) {
        // Usar el email proporcionado como parámetro
        const emailStr = String(email);
        if (emailStr.includes('@')) {
            const parteLocal = emailStr.split('@')[0];
            const isLikelyId = /^[a-f0-9]{24}$/i.test(parteLocal) || /^u_[a-z0-9_]+$/i.test(parteLocal);
            if (parteLocal && !isLikelyId) {
                nombreCompleto = parteLocal
                    .replace(/[._+-]/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase())
                    .trim() || emailStr;
            } else {
                nombreCompleto = emailStr;
            }
        } else {
            nombreCompleto = emailStr;
        }
    } else {
        // Último recurso
        nombreCompleto = `Usuario ${user.id || 'Nuevo'}`;
    }

    // Obtener profesor_asignado_id - puede estar como profesorAsignadoId (después de snakeToCamel) 
    // o como profesor_asignado_id (directo de Supabase)
    let profesorAsignadoId = user.profesorAsignadoId || user.profesor_asignado_id || null;

    // Validar que profesorAsignadoId sea un UUID válido (en Supabase debe ser UUID)
    // Si no es UUID válido, establecer como null para evitar errores
    if (profesorAsignadoId) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(String(profesorAsignadoId).trim())) {
            // Si no es un UUID válido (por ejemplo, es un ID de MongoDB), ignorarlo
            // Esto puede pasar si hay datos locales mezclados con datos de Supabase
            profesorAsignadoId = null;
        }
    }

    // Asegurar que full_name siempre tenga un valor si nombreCompleto está disponible
    // full_name es la fuente de verdad, pero si no existe en la BD, usar nombreCompleto generado
    let finalFullName = (fullName && fullName.trim()) || (nombreCompleto && nombreCompleto.trim()) || '';

    // Si aún está vacío y hay email, usar email como último recurso para full_name
    if (!finalFullName && email) {
        const emailStr = String(email);
        if (emailStr.includes('@')) {
            const parteLocal = emailStr.split('@')[0];
            const isLikelyId = /^[a-f0-9]{24}$/i.test(parteLocal) || /^u_[a-z0-9_]+$/i.test(parteLocal);
            if (parteLocal && !isLikelyId) {
                finalFullName = parteLocal
                    .replace(/[._+-]/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase())
                    .trim() || emailStr;
            } else {
                finalFullName = emailStr;
            }
        } else {
            finalFullName = emailStr;
        }
    }

    // Si nombreCompleto está vacío pero finalFullName tiene valor, sincronizar
    if (!nombreCompleto && finalFullName) {
        nombreCompleto = finalFullName;
    }

    // Retornar usuario normalizado con todos los campos necesarios
    return {
        ...user,
        // Campos mapeados
        rolPersonalizado: rolPersonalizado,
        nombreCompleto: nombreCompleto,
        full_name: finalFullName, // full_name es la fuente de verdad - usar valor de BD o fallback
        // Email: usar el proporcionado o el que ya está en el usuario
        email: email || user.email || '',
        // Profesor asignado - asegurar que esté en camelCase y sea UUID válido
        profesorAsignadoId: profesorAsignadoId,
        // Estado (mapear isActive a estado si es necesario)
        estado: user.isActive !== false ? 'activo' : 'inactivo',
        isActive: user.isActive !== false,
        // Mapear nivel_tecnico a nivelTecnico si existe
        nivelTecnico: user.nivelTecnico || user.nivel_tecnico || 1,
        // Mapear nivel (experiencia) si existe
        nivel: user.nivel || null,
    };
}
