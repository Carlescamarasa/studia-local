/**
 * Utilidades compartidas para manejo de secuencias de sesiones
 */

// Generador simple de IDs
export const uid = () => Math.random().toString(36).slice(2, 9);

/**
 * Asegura que cada ronda tenga ID estable
 */
export function ensureRondaIds(sesion: any) {
  if (!sesion) return sesion;

  const withIds = (sesion.rondas || []).map((r: any, i: number) => ({
    ...r,
    id: r.id || `r_${i}`
  }));

  return { ...sesion, rondas: withIds };
}

/**
 * Construye una secuencia por defecto cuando no existe
 * Por defecto: ejercicios sueltos (los que NO están en rondas) seguidos de las rondas
 */
export function buildDefaultSecuencia(sesion: any) {
  const S = ensureRondaIds(sesion);
  const codesEnRondas = new Set((S.rondas || []).flatMap((r: any) => r.bloques || []));

  return [
    ...(S.bloques || [])
      .filter((b: any) => !codesEnRondas.has(b.code))
      .map((b: any) => ({ kind: 'BLOQUE', code: b.code })),
    ...(S.rondas || []).map((r: any) => ({ kind: 'RONDA', id: r.id })),
  ];
}

/**
 * Devuelve la secuencia efectiva (preferir s.secuencia si existe)
 */
export function getSecuencia(sesion: any) {
  const S = ensureRondaIds(sesion);
  return (S.secuencia && S.secuencia.length) ? S.secuencia : buildDefaultSecuencia(S);
}

/**
 * Cálculo único del tiempo de sesión
 * No cuenta AD, y las rondas suman repeticiones
 */
export function calcularTiempoSesion(sesion: any) {
  if (!sesion) return 0;

  const S = ensureRondaIds(sesion);

  // Tiempo base de ejercicios (excluyendo AD)
  const base = (S.bloques || [])
    .filter((b: any) => b.tipo !== 'AD')
    .reduce((acc: number, b: any) => acc + (b.duracionSeg || 0), 0);

  // Tiempo de rondas (suma ejercicios × repeticiones)
  const fromRounds = (S.rondas || []).reduce((acc: number, r: any) => {
    const sumRonda = r.bloques.reduce((sum: number, code: string) => {
      const b = S.bloques?.find((x: any) => x.code === code);
      return (!b || b.tipo === 'AD') ? sum : sum + (b.duracionSeg || 0);
    }, 0);
    return acc + sumRonda * Math.max(1, r.repeticiones || 1);
  }, 0);

  return base + fromRounds; // segundos
}

/**
 * Shuffle simple (in-place) – NO persistir resultado
 */
export function shuffle(array: any[]) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Orden para reproducir la ronda (baraja si aleatoria==true)
 */
export function ordenRondaParaPlay(ronda: any) {
  const arr = ronda.bloques.slice();
  return ronda.aleatoria ? shuffle(arr) : arr;
}

/**
 * Crea un mapa code -> bloque para lookup rápido
 */
export function mapBloquesByCode(sesion: any) {
  const m = new Map();
  (sesion?.bloques || []).forEach((b: any) => m.set(b.code, b));
  return m;
}