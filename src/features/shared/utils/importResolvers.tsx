import { localDataClient } from "@/api/localDataClient";
import { Bloque } from "@/types/data.types";

/**
 * Normaliza texto para comparación (trim, lowercase)
 */
function normalize(str: any): string {
  if (!str) return '';
  return String(str).trim().toLowerCase();
}

/**
 * Resuelve ID de usuario por email
 */
export async function resolveUserIdByEmail(email: string | null | undefined): Promise<string | null> {
  if (!email) return null;

  const users = await localDataClient.entities.User.list();
  const found = users.find(u => normalize(u.email) === normalize(email));
  return found?.id || null;
}

/**
 * Resuelve ID de pieza por nombre
 */
export async function resolvePieceIdByName(nombrePieza: string | null | undefined): Promise<string | null> {
  if (!nombrePieza) return null;

  const piezas = await localDataClient.entities.Pieza.list();
  const found = piezas.find(p => normalize(p.nombre) === normalize(nombrePieza));
  return found?.id || null;
}

/**
 * Resuelve ID de pieza por nombre o slug
 */
export async function resolvePieceIdByNameOrSlug(nombreOSlug: string | null | undefined): Promise<string | null> {
  if (!nombreOSlug) return null;

  const piezas = await localDataClient.entities.Pieza.list();
  const normalized = normalize(nombreOSlug);
  const found = piezas.find(p =>
    normalize(p.nombre) === normalized ||
    normalize(p.slug) === normalized
  );
  return found?.id || null;
}

/**
 * Resuelve ID de ejercicio por código
 */
export async function resolveExerciseIdByCode(code: string | null | undefined): Promise<string | null> {
  if (!code) return null;

  const bloques = await localDataClient.entities.Bloque.list();
  const found = bloques.find(b => normalize(b.code) === normalize(code));
  return found?.id || null;
}

/**
 * Resuelve ID de ejercicio por nombre
 */
export async function resolveExerciseIdByName(nombre: string | null | undefined): Promise<string | null> {
  if (!nombre) return null;

  const bloques = await localDataClient.entities.Bloque.list();
  const found = bloques.find(b => normalize(b.nombre) === normalize(nombre));
  return found?.id || null;
}

/**
 * Resuelve ID de plan por nombre
 */
export async function resolvePlanIdByName(nombrePlan: string | null | undefined): Promise<string | null> {
  if (!nombrePlan) return null;

  const planes = await localDataClient.entities.Plan.list();
  const found = planes.find(p => normalize(p.nombre) === normalize(nombrePlan));
  return found?.id || null;
}

/**
 * Resuelve múltiples IDs de ejercicios por códigos
 */
export async function resolveExerciseIdsByCodes(codes: string[] | null | undefined): Promise<string[]> {
  if (!codes || !Array.isArray(codes)) return [];

  const bloques = await localDataClient.entities.Bloque.list();
  return codes.map(code => {
    const found = bloques.find(b => normalize(b.code) === normalize(code));
    return found?.id || null;
  }).filter((id): id is string => !!id);
}

/**
 * Resuelve datos completos de ejercicios por códigos (para planes)
 */
export async function resolveExercisesByCodes(codes: string[] | null | undefined): Promise<Partial<Bloque>[]> {
  if (!codes || !Array.isArray(codes)) return [];

  const bloques = await localDataClient.entities.Bloque.list();
  return codes.map(code => {
    const found = bloques.find(b => normalize(b.code) === normalize(code));
    if (!found) return null;

    return {
      nombre: found.nombre,
      code: found.code,
      tipo: found.tipo,
      duracionSeg: found.duracionSeg,
      instrucciones: found.instrucciones || '',
      indicadorLogro: found.indicadorLogro || '',
      materialesRequeridos: found.materialesRequeridos || [],
      media: (found as any).media || {},
      elementosOrdenados: found.elementosOrdenados || [],
    } as Partial<Bloque>;
  }).filter((b): b is Partial<Bloque> => !!b);
}