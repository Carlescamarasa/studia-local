/**
 * Mapa de rutas home por rol de usuario
 */
export const roleHome = {
  ADMIN: "/usuarios",
  PROF: "/agenda", 
  ESTU: "/hoy"
};

/**
 * Obtiene la ruta home para un rol dado
 */
export function getHomeForRole(role) {
  return roleHome[role] || roleHome.ESTU;
}