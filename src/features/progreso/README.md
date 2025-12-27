# Feature: Progreso

Dashboard unificado de progreso del estudiante. Proporciona visualización completa del progreso técnico, habilidades maestras, estadísticas de práctica, mochila y feedback del profesor.

## 📁 Estructura

```
features/progreso/
├── components/          # Componentes de UI del feature
│   ├── ProgresoPage.tsx        # Página principal (routing desde pages/progreso.tsx)
│   ├── HabilidadesView.tsx     # Vista de habilidades maestras
│   ├── *Tab.tsx                # Componentes de cada pestaña
│   ├── *Chart.tsx              # Componentes de visualización
│   ├── *Metric.tsx             # Componentes de métricas
│   └── index.ts                # Barrel export
├── hooks/               # Hooks específicos del dominio progreso
│   ├── useXP.ts                # XP totals, práctica, evaluación, goals
│   ├── useEstadisticas.ts      # KPIs y estadísticas calculadas
│   ├── useHabilidadesStats.ts  # Stats de habilidades maestras
│   ├── useStudentSkillsData.ts # Agregación de skills data
│   ├── useStudentSkillsRadar.ts# Datos para radar chart
│   └── index.ts                # Barrel export
├── utils/               # Utilidades del feature
│   ├── chartHelpers.ts         # Helpers para gráficos (buckets, colores)
│   └── progresoUtils.ts        # Date formatting, duration utils
└── README.md            # Este archivo
```

## 🎯 Responsabilidades

Este feature gestiona:

- **Visualización de Progreso:** Dashboard con KPIs, XP total, radar de habilidades
- **Habilidades Maestras:** Vista detallada con toggle forma/rango, criterios key
- **Estadísticas:** Gráficos de actividad, heatmaps, tipos de bloques, top ejercicios
- **Mochila del Estudiante:** Tabla de ítems con funcionalidad CRUD
- **Feedback Semanal:** Vista unificada de feedbacks del profesor
- **Comparativa (PROF/ADMIN):** Comparación de múltiples estudiantes

## 🔌 Dependencias Externas

### Hooks Globales
- `@/hooks/entities/useUsers` - Lista de usuarios
- `@/hooks/entities/useAsignaciones` - Asignaciones alumno-profesor
- `@/hooks/entities/useLevelsConfig` - Configuración de niveles
- `@/hooks/entities/useEvaluacionesTecnicas` - Evaluaciones técnicas
- `@/hooks/entities/useFeedbacksSemanal` - Feedbacks semanales

### Servicios Compartidos
- `@/shared/services/xpService` - Cálculo de XP (práctica, evaluación, manual)
- `@/shared/services/backpackService` - Gestión de mochila del estudiante
- `@/shared/services/backpackDerivedStatus` - Estado derivado de mochila
- `@/services/manualSessionService` - Creación de sesiones manuales

### API
- `@/api/localDataClient` - Cliente local IndexedDB
- Supabase (a través de hooks de entities)

### Providers
- `@/providers/EffectiveUserProvider` - Usuario efectivo (impersonation)

## 📊 Flujo de Datos

### 1. Carga Inicial (ProgresoPage.tsx)

```typescript
effectiveUserId → localDataClient.getProgressSummary() → {
  xpTotals,
  evaluacionesTecnicas,
  registrosSesion
}
```

### 2. Cálculo de KPIs (useEstadisticas)

```typescript
registrosFiltrados + bloquesFiltrados → {
  kpis: { tiempoTotal, sesiones, calificacionMedia, ... },
  datosLinea: [...], // Para gráficos de línea
  tiposBloques: [...], // Para gráfico de tipos
  topEjercicios: [...] // Para tabla de top ejercicios
}
```

### 3. Habilidades Maestras (HabilidadesView)

```typescript
useHabilidadesStats(alumnoId) → {
  motricidad, articulacion, flexibilidad,
  sonido, cognicion
}

+ useStudentSkillsData(alumnoId) → ProcessedSkillsData
```

### 4. XP y Niveles (useXP)

```typescript
useAllStudentXPTotals() // Cache global
  ↓
useTotalXP(studentId) → StudentXPTotal[]
useLifetimePracticeXP(studentId) → { motricidad, articulacion, flexibilidad }
useAggregateLevelGoals(studentIds) → { goals, currentLevel, nextLevel }
```

## 🧩 Componentes Principales

### ProgresoPage.tsx
Página principal con:
- Tabs: Resumen, Habilidades, Estadísticas, Mochila, Feedback, Comparar
- Selector de estudiantes (PROF/ADMIN)
- Filtros de fecha (presets: Semana, 4 sem, Mes, 3 meses, Todo)
- Gestión de estado global (tab, filtros, alumnos seleccionados)

### HabilidadesView.tsx
Vista de habilidades maestras con:
- Toggle vista: Forma / Rango
- Radar chart de habilidades
- Criterios key por habilidad (PROF/ADMIN pueden marcar como logrados)
- Filtrado por estudiante y rango de fechas

### Tabs Especializados
- **ResumenTab:** KPIs + XP total + Radar
- **ProgresoTab:** Gráfico de progreso temporal
- **FeedbackUnificadoTab:** Lista de feedbacks con modal de detalle
- **TiposBloquesTab:** Gráfico de tipos de bloques practicados
- **TopEjerciciosTab:** Tabla de ejercicios más practicados
- **AutoevaluacionesTab:** Autoevaluaciones del estudiante
- **ComparativaEstudiantes:** Comparación multi-estudiante (PROF/ADMIN)

## 🎣 Hooks Principales

### useXP.ts
Gestión completa de XP:
- `useAllStudentXPTotals()` - Cache global de XP totals
- `useTotalXP(studentId)` - XP total por estudiante
- `useLifetimePracticeXP(studentId)` - XP de práctica vitalicio
- `useAggregateLevelGoals(studentIds)` - Goals agregados para múltiples estudiantes

### useEstadisticas.ts
Cálculo de estadísticas y KPIs:
- Tiempo total, sesiones, racha, calificación media
- Datos para gráficos de línea
- Tipos de bloques practicados
- Top ejercicios

### useHabilidadesStats.ts
Stats de habilidades maestras:
- `useHabilidadesStats(studentId)` - Stats por estudiante individual
- `useHabilidadesStatsMultiple(studentIds)` - Stats agregados

### useStudentSkillsData.ts
Agregación de datos de skills (XP, evaluaciones, feedbacks):
- Procesa datos de múltiples fuentes
- Cache de resultado procesado (2 min)
- Interface `ProcessedSkillsData`

## 🛠️ Utils

### chartHelpers.ts
Helpers para visualización:
- `chooseBucket(inicio, fin)` - Elige granularidad óptima para gráficos
- `getColorForSkill(skill)` - Colores consistentes por habilidad
- Funciones de agregación de datos por día/semana/mes

### progresoUtils.ts
Utilidades de fecha y duración:
- `formatLocalDate(date)` - Formato YYYY-MM-DD local
- `parseLocalDate(str)` - Parse de fecha local
- `startOfMonday(date)` - Inicio de semana el lunes
- `formatDuracionHM(seg)` - Formato HH:MM
- `formatDurationDDHHMM(seg)` - Formato DD días HH:MM

## 📝 Guía de Uso

### Importar Hooks

```typescript
// Individual
import { useXP, useEstadisticas } from '@/features/progreso/hooks';

// O desde archivo específico
import { useTotalXP } from '@/features/progreso/hooks/useXP';
```

### Importar Componentes

```typescript
import {
  ProgresoTab,
  HabilidadesView,
  KpiTile
} from '@/features/progreso/components';
```

### Usar useEstadisticas

```typescript
const estadisticas = useEstadisticas({
  registrosFiltradosUnicos,
  bloquesFiltrados,
  periodoInicio: '2024-01-01',
  periodoFin: '2024-12-31',
  granularidad: 'dia', // 'dia' | 'semana' | 'mes'
  isEstu: false,
  userIdActual: 'user-id',
});

const { kpis, datosLinea, tiposBloques } = estadisticas;
```

### Extender con Nuevos Componentes

1. Crear componente en `components/`
2. Exportar en `components/index.ts`
3. Importar donde sea necesario

### Extender con Nuevos Hooks

1. Crear hook en `hooks/`
2. Exportar en `hooks/index.ts`
3. Seguir patrón de React Query para cache

## 🔄 Invalidación de Cache

Los hooks usan React Query con keys específicas:
- `['progressSummary', studentId]` - Resumen de progreso
- `['student-xp-total-all']` - XP totals (global)
- `['recent-xp', studentId, days]` - XP reciente
- `QUERY_KEYS.STUDENT_SKILLS_PROCESSED(studentId)` - Skills procesadas

Invalidar cuando:
- Se completa una sesión de práctica
- Se crea/edita una evaluación técnica
- Se crea/edita un feedback semanal
- Se actualiza la mochila del estudiante

## 🧪 Testing (Future)

Hooks prioritarios para tests:
- `useXP.test.ts` - Cálculo de XP agregado
- `useEstadisticas.test.ts` - Cálculo de KPIs
- `chartHelpers.test.ts` - Lógica de buckets

## 📚 Referencias

- [Diseño de Sistema XP](/docs/xp-system.md)
- [Habilidades Maestras](/docs/habilidades-maestras.md)
- [React Query Best Practices](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr)
