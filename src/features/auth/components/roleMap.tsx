/**
 * Mapa de rutas home por rol de usuario
 */
export const roleHome = {
  ADMIN: "/usuarios",
  PROF: "/cuaderno",
  ESTU: "/hoy"
};

/**
 * Obtiene la ruta home para un rol dado
 */
export function getHomeForRole(role: string) {
  return roleHome[role as keyof typeof roleHome] || roleHome.ESTU;
}