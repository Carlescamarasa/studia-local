# Plan de Refactorización de Estadísticas

## 📋 Resumen Ejecutivo

Este documento describe el plan completo para refactorizar y mejorar la sección de estadísticas (`estadisticas.jsx`), que actualmente tiene más de 2000 líneas y necesita ser modularizada y mejorada.

## 🎯 Objetivos

1. **Modularización**: Separar cada tab en componentes independientes
2. **Mejora de UX**: Mejor experiencia visual en desktop y mobile
3. **Nuevas métricas**: Añadir visualizaciones y datos útiles
4. **Accesibilidad**: Mejorar contraste, tooltips, y claridad visual
5. **Mantenibilidad**: Código más limpio y fácil de mantener

## 📦 Estructura de Componentes Propuesta

```
src/components/estadisticas/
├── StatCard.jsx              ✅ CREADO - Componente base para métricas
├── ResumenTab.jsx            ✅ CREADO - Tab de resumen con KPIs
├── ProgresoTab.jsx           ⏳ PENDIENTE - Línea de tiempo de sesiones
├── TiposBloquesTab.jsx       ⏳ PENDIENTE - Análisis por tipo de bloque
├── TopEjerciciosTab.jsx      ⏳ PENDIENTE - Top ejercicios practicados
├── AutoevaluacionesTab.jsx   ⏳ PENDIENTE - Historial de autoevaluaciones
├── FeedbackTab.jsx           ⏳ PENDIENTE - Feedback del profesor
├── HeatmapActividad.jsx      ⏳ PENDIENTE - Heatmap estilo GitHub
├── ProgresoPorPieza.jsx      ⏳ PENDIENTE - Vista comparativa por pieza
├── ComparativaEstudiantes.jsx ⏳ PENDIENTE - Vista comparativa (PROF/ADMIN)
├── utils.js                  ✅ CREADO - Utilidades compartidas
└── hooks/
    ├── useEstadisticas.js    ⏳ PENDIENTE - Hook para cálculos de estadísticas
    └── useFiltros.js          ⏳ PENDIENTE - Hook para manejo de filtros
```

## 🔄 Reorganización de Tabs

### Tabs Actuales → Nuevas Tabs

| Actual | Nueva | Descripción |
|--------|-------|-------------|
| `resumen` | `resumen` | KPIs principales + gráfico de evolución |
| `evolucion` | `progreso` | Línea de tiempo detallada de sesiones |
| `tipos` | `tipos` | Análisis por tipo de bloque |
| `top` | `top` | Top ejercicios practicados |
| `historial` | `autoevaluaciones` | Historial de autoevaluaciones del estudiante |
| `feedback` | `feedback` | Feedback del profesor |

### Orden Propuesto

1. **Resumen** - Vista general con KPIs
2. **Progreso** - Evolución temporal detallada
3. **Tipos de Bloques** - Análisis por tipo
4. **Top Ejercicios** - Ejercicios más practicados
5. **Autoevaluaciones** - Historial de calificaciones
6. **Feedback** - Comentarios del profesor

## ✨ Nuevas Métricas a Añadir

### 1. Heatmap de Actividad
- **Componente**: `HeatmapActividad.jsx`
- **Datos**: Frecuencia de sesiones por día/hora
- **Visualización**: Grid estilo GitHub (días de la semana × semanas)
- **Colores**: Intensidad según número de sesiones

### 2. Ratio Completado vs Omitido
- **Cálculo**: `(completados / (completados + omitidos)) * 100`
- **Visualización**: Gráfico de barras o donut
- **Ubicación**: Tab "Progreso" o "Resumen"

### 3. Tiempo Real vs Objetivo
- **Datos**: `duracion_real_seg` vs `duracion_objetivo_seg`
- **Visualización**: Gráfico de barras comparativo
- **Métricas**: 
  - Promedio de diferencia
  - % de sesiones que cumplen objetivo
  - Tendencias temporales

### 4. Progreso por Pieza
- **Componente**: `ProgresoPorPieza.jsx`
- **Datos**: Agrupar por `pieza_nombre` desde `registros_sesion`
- **Métricas**:
  - Tiempo total por pieza
  - Número de sesiones por pieza
  - Calificación promedio por pieza
  - Evolución temporal por pieza
- **Visualización**: Cards o tabla comparativa

### 5. Vista Comparativa de Estudiantes
- **Componente**: `ComparativaEstudiantes.jsx`
- **Rol**: Solo PROF/ADMIN
- **Datos**: Comparar métricas entre estudiantes
- **Visualización**: Tabla o gráfico comparativo
- **Métricas comparables**:
  - Tiempo total
  - Sesiones/semana
  - Calificación promedio
  - % completado

### 6. Indicadores de Inactividad
- **Cálculo**: Días sin práctica
- **Visualización**: Badge o alerta visual
- **Lógica**: Si > 7 días sin práctica → warning

### 7. % Sesiones Completadas sin Omitir
- **Cálculo**: `(sesiones con bloques_omitidos === 0) / total_sesiones * 100`
- **Visualización**: StatCard o badge
- **Ubicación**: Tab "Resumen"

## 📱 Mejoras Mobile-First

### Componentes a Reemplazar

1. **Tablas → StatCards**
   - `UnifiedTable` en mobile → Grid de `StatCard`
   - Mantener tabla en desktop (`sm:` breakpoint)

2. **Gráficos Responsivos**
   - Altura reducida en mobile (180px vs 250px)
   - Fuentes más pequeñas
   - Menos ticks en ejes

3. **Layout Adaptativo**
   - Grid: `grid-cols-2 sm:grid-cols-4 lg:grid-cols-8`
   - Padding: `p-2 sm:p-3 md:p-4`
   - Espaciado: `gap-2 sm:gap-3 md:gap-4`

### Eliminar Scroll Horizontal

- Usar `overflow-x-auto` solo cuando sea necesario
- Ajustar anchos con `min-w-0` y `truncate`
- Usar `flex-wrap` en lugar de scroll horizontal

## 🎨 Mejoras de Accesibilidad

### Contraste

- Textos principales: `text-[var(--color-text-primary)]`
- Textos secundarios: `text-[var(--color-text-secondary)]`
- Textos muted: `text-[var(--color-text-muted)]`

### Tooltips

- Añadir `title` o componente `Tooltip` en:
  - Íconos sin etiqueta
  - Métricas que necesiten explicación
  - Siglas (ej: "CA", "CB", etc.)

### Indicadores Visuales

- **Foco**: Badges con colores según `foco` (GEN, LIG, RIT, ART, S&A)
- **Tipo de bloque**: Badges con colores según tipo
- **Estado**: Colores para completado/omitido

## 🔧 Refactorización Técnica

### Paso 1: Crear Componentes Base ✅

- [x] `StatCard.jsx` - Componente base para métricas
- [x] `utils.js` - Utilidades compartidas
- [x] `ResumenTab.jsx` - Tab de resumen (ejemplo)

### Paso 2: Extraer Lógica de Cálculos

- [ ] Crear `useEstadisticas.js` hook:
  - `useKPIs(registros, bloques)`
  - `useTiposBloques(bloques)`
  - `useTopEjercicios(bloques)`
  - `useDatosLinea(registros, granularidad)`
  - `useHeatmapData(registros)`
  - `useProgresoPorPieza(registros)`

### Paso 3: Crear Componentes de Tabs

- [ ] `ProgresoTab.jsx` - Con heatmap y gráficos avanzados
- [ ] `TiposBloquesTab.jsx` - Análisis por tipo
- [ ] `TopEjerciciosTab.jsx` - Top ejercicios
- [ ] `AutoevaluacionesTab.jsx` - Historial
- [ ] `FeedbackTab.jsx` - Feedback del profesor

### Paso 4: Componentes de Visualización

- [ ] `HeatmapActividad.jsx` - Heatmap estilo GitHub
- [ ] `ProgresoPorPieza.jsx` - Vista comparativa
- [ ] `ComparativaEstudiantes.jsx` - Comparativa (PROF/ADMIN)

### Paso 5: Integración

- [ ] Actualizar `estadisticas.jsx` para usar componentes modulares
- [ ] Mantener filtros y estado en el componente principal
- [ ] Pasar datos calculados como props a cada tab

## 📊 Métricas Sugeridas Adicionales

1. **Consistencia de práctica**
   - Días de la semana más practicados
   - Horas del día más practicados
   - Patrón de práctica (mañana/tarde/noche)

2. **Eficiencia**
   - Tiempo promedio por bloque
   - Tiempo promedio por tipo de bloque
   - Comparación con objetivos

3. **Progreso por semana**
   - Tiempo por semana
   - Sesiones por semana
   - Calificación promedio por semana

4. **Áreas de mejora**
   - Tipos de bloque con más omisiones
   - Tipos de bloque con menor calificación
   - Tendencias negativas

## 🚀 Próximos Pasos

1. **Validar métricas existentes** - Revisar cálculos de KPIs
2. **Completar componentes base** - Crear todos los componentes de tabs
3. **Añadir nuevas métricas** - Implementar heatmap, comparativas, etc.
4. **Mejorar mobile** - Reemplazar tablas por StatCards
5. **Testing** - Probar con diferentes roles y datos

## 📝 Notas Técnicas

- **Datos disponibles**:
  - `registros_sesion`: Sesiones completas con duración, calificación, bloques
  - `registros_bloque`: Bloques individuales con tipo, duración, estado
  - `feedbacks_semanal`: Feedback del profesor
  - `asignaciones`: Asignaciones con piezas y planes

- **Filtros actuales**:
  - Período (inicio/fin)
  - Profesores (PROF/ADMIN)
  - Alumnos (PROF/ADMIN)
  - Focos (GEN, LIG, RIT, ART, S&A)
  - Calificación (historial)

- **Roles**:
  - `ESTU`: Solo sus propios datos
  - `PROF`: Sus estudiantes
  - `ADMIN`: Todos los datos

