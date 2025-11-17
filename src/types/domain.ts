/**
 * Tipos de dominio para Studia
 * 
 * Estos tipos representan las entidades de negocio de la aplicación
 * y son compartidos entre LocalDataProvider y RemoteDataProvider (futuro).
 */

/**
 * Roles de usuario en el sistema
 */
export type UserRole = 'ADMIN' | 'PROF' | 'ESTU';

/**
 * Usuario de Studia
 * 
 * Representa un usuario del sistema (administrador, profesor o estudiante).
 * Este tipo es el contrato compartido entre el modelo local y el remoto (Supabase).
 * 
 * @property id - Identificador único del usuario (UUID en Supabase, string en local)
 * @property email - Email del usuario (se sincroniza con auth.users.email en Supabase)
 * @property full_name - Nombre completo del usuario
 * @property role - Rol del usuario: ADMIN, PROF o ESTU
 * @property profesor_asignado_id - ID del profesor asignado (solo para estudiantes, nullable)
 * @property is_active - Indica si el usuario está activo
 * @property created_at - Fecha de creación del usuario (ISO string)
 * @property updated_at - Fecha de última actualización (ISO string)
 * 
 * Notas:
 * - Los campos `first_name` y `last_name` del modelo local se pueden derivar de `full_name` si es necesario
 * - El campo `nombreCompleto` del modelo local es equivalente a `full_name`
 * - El campo `rolPersonalizado` del modelo local se mapea a `role`
 * - El campo `estado` del modelo local se mapea a `is_active` (true si "activo")
 * - El campo `fechaRegistro` del modelo local se mapea a `created_at`
 */
export interface StudiaUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  profesor_asignado_id: string | null;
  is_active: boolean;
  created_at: string; // ISO 8601 string
  updated_at: string; // ISO 8601 string
}

/**
 * Tipo auxiliar para crear un usuario (sin campos auto-generados)
 */
export type CreateStudiaUserInput = Omit<StudiaUser, 'id' | 'created_at' | 'updated_at'>;

/**
 * Tipo auxiliar para actualizar un usuario (todos los campos opcionales excepto id)
 */
export type UpdateStudiaUserInput = Partial<Omit<StudiaUser, 'id' | 'created_at'>> & {
  id: string;
};

