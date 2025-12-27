# Capa de Datos: Habilidades Técnicas

Este documento describe la arquitectura de datos para el dashboard de habilidades técnicas y el radar de progreso del estudiante.

## Componentes y Fuentes de Datos

El dashboard de habilidades (`HabilidadesView`) se alimenta principalmente de una fuente consolidada Calculada en el servidor (RPC) para garantizar consistencia entre las vistas de "Estado de Forma" y los reportes.

### 1. Radar Chart / Estado de Forma
*   **Fuente Principal:** RPC `get_student_skills_radar`
*   **Hook Cliente:** `useStudentSkillsRadar(studentId)`
*   **Datos:** Retorna un objeto JSON normalizado (0-10) para las 5 dimensiones:
    *   **Cuantitativas (XP vs Meta):** Motricidad, Articulación, Flexibilidad.
    *   **Cualitativas (Evaluaciones):** Sonido, Cognición.
*   **Lógica:** La normalización ocurre en PostgreSQL, comparando la XP acumulada con la configuración del nivel del estudiante (`levels_config`).

### 2. Tarjetas de Resumen (KPIs)
*   **Fuente:** Los valores numéricos (XP Actual / Meta) provienen del campo `meta` devuelto por el mismo RPC `get_student_skills_radar`.
*   **Ventaja:** Evita discrepancias entre el gráfico y los números mostrados.

## Hooks y RPCs

### `get_student_skills_radar` (RPC)
Función PostgreSQL (`SECURITY DEFINER`) que encapsula toda la lógica de negocio:
*   Consulta el nivel del estudiante.
*   Obtiene los requisitos de XP de ese nivel.
*   Suma la XP total de `student_xp_total`.
*   Promedia las evaluaciones de `evaluaciones_tecnicas` (últimos 30 días por defecto).
*   Normaliza los resultados a una escala 0-10.

### `useStudentSkillsRadar` (Hook)
Hook de React Query que consume el RPC anterior.
*   **Query Key:** `['student-skills-radar', studentId]`
*   **Stale Time:** 2 minutos (balance entre frescura y rendimiento).

### `useHabilidadesStats` (Legacy Wrapper)
Anteriormente realizaba cálculos en el cliente. Ahora actúa como adaptador:
*   Si se solicita para un solo estudiante, delega internamente a `useStudentSkillsRadar`.
*   Mantiene compatibilidad con la interfaz de `HabilidadesRadarChart`.
*   *Nota:* La versión "Multiple" (`useHabilidadesStatsMultiple`) aún realiza agregaciones en cliente (pendiente de migrar a RPC si el rendimiento lo requiere).

## Estrategia de Caché e Invalidación

La gestión de caché se realiza vía **React Query** (`QueryClient`).

### Claves de Caché (`QUERY_KEYS`)
*   `STUDENT_SKILLS_RADAR(studentId)`: Datos del radar.

### Invalidación
Se debe invalidar la caché cuando ocurren eventos que afectan la puntuación:
1.  **Nueva Sesión de Estudio:** Aumenta la XP.
    *   Acción: Invalida `STUDENT_XP_ALL` y `STUDENT_SKILLS_RADAR`.
2.  **Nueva Evaluación Técnica:** Afecta Sonido/Cognición.
    *   Acción: Invalida `EVALUACIONES_TECNICAS` y `STUDENT_SKILLS_RADAR`.
3.  **Cambio de Nivel:** Cambia las metas de normalización.
    *   Acción: Invalida `STUDENT_PROFILE` y `STUDENT_SKILLS_RADAR`.

Helper disponible en `queryKeys.ts`: `invalidateStudentSkills(queryClient, studentId)`.

## Guía para Extender

### Añadir una Nueva Habilidad (Skill)

1.  **Base de Datos:**
    *   Columnas en `student_xp_total` (si es cuantitativa).
    *   Claves JSON en `evaluaciones_tecnicas` (si es cualitativa).
    *   Columnas en `levels_config` (si requiere meta por nivel).
2.  **RPC (`get_student_skills_radar`):**
    *   Añadir lógica de extracción y normalización.
    *   Incluir el nuevo campo en el objeto JSON de retorno.
3.  **Frontend (`useStudentSkillsRadar.ts`):**
    *   Actualizar interfaz TypeScript `StudentSkillsRadarData`.
4.  **UI (`HabilidadesRadarChart`):**
    *   Añadir el nuevo eje al gráfico Radar.

### Añadir un Nuevo KPI
Si el KPI deriva de los datos existentes (ej. "Promedio Global"), calcúlalo en el RPC y devuélvelo en el objeto JSON (o dentro de la clave `meta`) para mantener la lógica centralizada.
