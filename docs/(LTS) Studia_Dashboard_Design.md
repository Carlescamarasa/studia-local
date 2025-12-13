---
tipo: diseño_ui
area: Studia
status: borrador
---

# Diseño Dashboard Studia: "La Torre de Control"

> **Objetivo:** Un panel visual donde el Profesor pueda gestionar el estado del alumno (Aprendizaje vs Repaso) y el Alumno vea su progreso sin fricción.

---

## 1. Concepto Visual: "El Tablero de Entreno"

Olvidamos la lista de Excel. Pasamos a un sistema de **Tarjetas (Kanban simplificado)** y **Etiquetas (Chips)**.

### Estado del Ejercicio (Ciclo de Vida)
1.  **🟡 Aprendizaje (Modo Completo):** El ejercicio está en la "Mesa de Trabajo". Ocupa espacio visual grande.
2.  **🟢 Dominado (Modo Repaso):** El ejercicio pasa a la "Mochila". Se convierte en una etiqueta pequeña. El sistema elige 1 al azar.
3.  **🔴 Estancado (Bloqueado):** Alerta visual si lleva demasiado tiempo en Aprendizaje sin evolucionar.

---

## 2. Vista Profesor ("Modo Control")

### A. Resumen de Alumnos (Lista)
*   **Indicadores Rápidos (Semáforo):**
    *   🟢 **Al Día:** Ha cumplido >80% sesiones esta semana.
    *   🟡 **Revisión Pendiente:** Ha marcado un ejercicio como "Dominado" (Requiere validación).
    *   🔴 **Descolgado:** No ha practicado en 3 días o reporta Valoración < 2 recurrentemente.

### B. Detalle del Alumno (El Panel de Mando)

Este es el corazón de la gestión. Dividido en 3 columnas/áreas:

#### 1. Área de Fuego (Modo Estudio / Completo)
*Visualización:* Tarjetas Grandes.
*Contenido:* Ejercicios que el alumno tiene asignados en "Modo Completo".
*   **Acciones Rápidas:**
    *   🔽 **Mover a Repaso:** Si el profe valida que está listo.
    *   🗑️ **Quitar:** Si no funciona.
*   **Notificaciones:** Si el alumno marcó "Dominado", la tarjeta brilla/parpadea pidiendo confirmación.

#### 2. La Mochila (Mantenimiento / Modo Repaso)
*Visualización:* Nube de Etiquetas / Chips (Agrupados por Habilidad).
*Contenido:* Todo el repertorio que el alumno ha superado y ahora está en rotación aleatoria.
*   **Acciones:**
    *   🔼 **Reactivar:** Devolver a "Aprendizaje" (si se ha oxidado).
    *   👁️ **Ver Histórico:** Cuándo fue la última vez que salió.

#### 3. El Feed (Historial de Sesiones)
*   **Gráfico de Pulso:** Valoración subjetiva (1-4) de las últimas 10 sesiones.
*   **Registro de Ayer:**
    *   ✅ Cichowicz (Hecho)
    *   ✅ Clarke (Hecho)
    *   ⏩ Arban (Saltado - "No me dio tiempo")
    *   *Comentario:* "Me noté el labio cansado en el agudo".

---

## 3. Vista Alumno ("Modo Acción")

Simplificada al máximo. Menos gestión, más acción.

### A. Inicio (Hoy)
*   **Botón Gigante:** "EMPEZAR SESIÓN".
*   **Resumen:** "Hoy toca: Flexibilidad (Estudio) + Repaso de Articulación".

### B. Durante la Sesión (El Reproductor)
1.  **Bloque Estudio:** Muestra PDF completo.
    *   *Feedback:* Hecho (Check) / Saltar (Skip).
    *   *Botón:* "¡Lo tengo! (Solicitar revisión)".
2.  **Bloque Repaso:** Muestra `Fragmento_04.png`.
    *   *Feedback:* Hecho / Saltar. (No hay botón de "Dominado", se asume mantenimiento).

---

## 4. Flujo de Validación (La "Notificación")

1.  **Alumno:** Termina sesión. Marca el *Balay 1* como "Creo que ya lo tengo".
2.  **Sistema:**
    *   El ejercicio sigue en su rutina (Aprendizaje).
    *   Envía alerta al Profe: "Carles cree que domina Balay 1".
3.  **Profesor:**
    *   Entra al Dashboard. Ve la alerta.
    *   *Opción A:* En la próxima clase presencial/online lo escucha.
    *   *Opción B:* Le pide un audio (si la funcionalidad existe).
    *   **Acción:** Clic en "Aprobar" -> La tarjeta de *Balay 1* se encoge y vuela a la columna "Mochila (Repaso)".

---

## 5. Datos para el Panel de Control

Necesitamos guardar esto en `progreso_usuario`:

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `valoracion_sesion` | int (1-4) | Valoración global de la sesión. |
| `ejercicios_saltados` | array[id] | Qué se saltó (para detectar patrones de "odio"). |
| `solicitudes_dominio` | array[id] | Ejercicios que el alumno quiere validar. |
| `ejercicios_asignados` | array[id] | Lo que el profe ha "inyectado" manualmente para mañana. |

---

---

## 6. Arquitectura Técnica: Evolución del Core (Robustez)

El usuario tiene razón: crear tablas "parche" (`estado_bloques`) ensucia el modelo.
La solución robusta es **evolucionar la tabla `asignaciones`** para que sea la "Single Source of Truth" del estado, no solo un snapshot.

### A. Modificación de `asignaciones` (El Cerebro)
En lugar de crear tablas externas, añadimos capacidad de memoria a la asignación existente.

```sql
ALTER TABLE asignaciones ADD COLUMN mapa_progreso JSONB DEFAULT '{}';
```

**Estructura del `mapa_progreso`:**
Es un diccionario vivo donde la clave es el `bloque_code` (ID universal del ejercicio).
```json
{
  "TC-001": { 
    "status": "mastered", 
    "mode": "review", 
    "last_review": "2023-10-20",
    "mastery_level": 1 
  },
  "TC-002": { 
    "status": "learning", 
    "mode": "full" 
  }
}
```

### B. Ventajas de este enfoque
1.  **Integridad:** Si borras la asignación, se borra su progreso. No quedan huérfanos.
2.  **Performance:** Al cargar la asignación para generar la sesión, *ya tienes* el estado. No haces 50 queries extra a una tabla satélite.
3.  **Simplicidad:** Mantienes el esquema actual (Planes JSON + Asignaciones JSON) pero le das inteligencia.

### C. Modificación de `bloques` (Contenido)
Reforzamos el bloque para que soporte variantes nativamente.

```sql
ALTER TABLE bloques ADD COLUMN contenido_extendido JSONB;
```
*(Igual que la propuesta anterior: `full_asset` + `variations` array).*

### D. Algoritmo del Motor (Actualizado)
1.  **Load:** Carga `asignaciones` (incluyendo `plan_adaptado` y `mapa_progreso`).
2.  **Plan:** Mira qué toca hoy según `plan_adaptado`.
3.  **Filter:** Para cada ejercicio de la sesión, consulta el `mapa_progreso`:
    *   Si no existe entrada -> Asume `Learning` (Muestra `contenido_extendido.full_asset`).
    *   Si `status: mastered` -> Activa `Review Mode` (Elige random de `contenido_extendido.variations`).
4.  **Save:** Al terminar la sesión, actualiza `mapa_progreso` si hubo cambios de nivel (no solo guarda logs).

---

---

## 7. Gestión del Tiempo: La Promesa de Valor (Foco)

El usuario exige certidumbre: **"Estudia 45 minutos y mejorarás más que en 2 horas."**
Para cumplir esto, la sesión no puede ser "lo que salga", tiene que ajustarse a un **Presupuesto Fijo**.

### A. El Algoritmo "The Clipper" (Recorte Inteligente)
El motor no solo suma tiempos, **prioriza**.

*   **Input:**
    *   `Tiempo Disponible`: 45 min (Configurado por Profesor/Alumno).
    *   `Carga Teórica`: Suma de todos los ejercicios del día (ej. 65 min).
*   **Lógica de Recorte:**
    1.  **Prioridad 1 (Intocable):** Ejercicios en *Learning Mode* (Deep Work). Se comen, digamos, 30 min.
    2.  **Prioridad 2 (Relleno):** Ejercicios en *Review Mode*. Tenemos 15 min libres.
    3.  **Acción:** El sistema añade ejercicios de repaso aleatorios hasta llenar el cubo de 15 min.
    4.  **Descarte:** Lo que sobra, se queda fuera hoy (no se muestra).

### B. UI Alumno: Certeza Total
*   El botón de inicio dice: **"Empezar Sesión (45 min)"**.
*   No hay "aproximadamente". Es un contrato.
*   Si el alumno termina antes, genial. Si tarda más, es información para el profesor (ajustar dificultad).

### C. Configuración Profesor
El profesor define el **"Techo de Cristal"**:
*   *Config:* "Máximo por sesión: 50 min".
*   *Efecto:* Si añades 5 ejercicios nuevos, el sistema automáticamente convertirá el resto de la técnica a "Modo Repaso" o la rotará para que NUNCA se pase de 50 min.
*   **Resultado:** El alumno nunca se agobia. Siempre ve una meta alcanzable.

---

## 8. Smart Selector: Variaciones por Nivel y Contexto

El usuario plantea casos de uso complejos pero reales: *"Clarke 1 tiene 26 variaciones, pero el Nivel 3 solo puede ver las 5 primeras"* o *"Dentro de una Ronda (Calentamiento) quiero forzar repaso rápido"*.

### A. Filtrado por Nivel (Metadata de Variación)
Enriquecemos el JSON de variaciones con requisitos.

```json
"variations": [
  { "id": "v1", "asset": "url/v1.png", "min_level": 1, "tags": ["tono", "fácil"] },
  { "id": "v10", "asset": "url/v10.png", "min_level": 5, "tags": ["agilidad", "difícil"] }
]
```

**Lógica del Selector:**
1.  **Input:** Nivel actual del Usuario (ej. Nivel 3).
2.  **Filtro:** `variations.filter(v => user.level >= v.min_level)`.
3.  **Resultado:** El alumno de Nivel 3 nunca verá la variación 10, aunque el "ejercicio padre" sea el mismo.

### B. Anulación por Contexto (Overrides)
El `Plan JSON` puede dictar el modo, anulando el estado natural del ejercicio.

*   **Caso "Ronda de Calentamiento":**
    *   Definición en Plan: `{ "exercise_id": "TC-001", "force_mode": "review", "force_variant_tag": "tono" }`.
    *   *Comportamiento:* Aunque el alumno esté en "Learning" de ese ejercicio, aquí se le fuerza a tocar solo una variación de tono (review) como parte de la ronda.

*   **Caso "Fallback":**
    *   Si un ejercicio no tiene variaciones definidas, el sistema hace fallback automático a `full_asset` (Modo Completo). No rompe.

### C. Resumen de Jerarquía de Decisión
¿Qué veo hoy?
1.  ¿El Plan fuerza un modo? -> SÍ: Usa ese modo.
2.  ¿Estoy en "Learning"? -> SÍ: `Full Asset`.
3.  ¿Estoy en "Mastered"? -> SÍ: `Random Variation` (filtrada por mi nivel).
