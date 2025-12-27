# 📊 Análisis de Arquitectura por Dominios Funcionales

## Resumen Ejecutivo

**Objetivo**: Reorganizar Studia por dominios funcionales como preparación para escalabilidad, React Native y realtime via websockets.

**Estado actual**: 164 componentes, 24 hooks, 76 páginas con migración a TypeScript en curso (~30% completado).

---

## 1. 📦 Mapeo por Dominio Funcional

### 🎯 Asignaciones (`/features/asignaciones`)
**Descripción**: Gestión de tareas asignadas a estudiantes por profesores

#### Componentes
- `AsignacionesActivas.jsx`
- `AsignacionesArchivadas.jsx`
- `CrearAsignacionWizard.jsx`
- `FormularioRapido.jsx`
- `StudentSearchBar.jsx` / `StudentSearchBarAsync.jsx`

#### Hooks
- `hooks/entities/useAsignaciones.ts` ✅ TypeScript

#### API/Servicios
- `api/remote/asignaciones.ts` ✅ TypeScript (completo)

#### Páginas que lo consumen
- `pages/asignacion-detalle.jsx`
- `pages/adaptar-asignacion.jsx`
- `pages/cuaderno.jsx` (tab asignaciones)
- `pages/semana.jsx`
- `pages/hoy.jsx`

---

### 👥 Usuarios (`/features/usuarios`)
**Descripción**: Gestión de perfiles y usuarios (estudiantes, profesores, admin)

#### Componentes
- `components/estudiantes/` (varios)
- `components/admin/LevelConfigView.jsx`
- `components/common/PerfilModal.jsx`

#### Hooks
- `hooks/entities/useUsers.ts` ✅ TypeScript
- `hooks/useCurrentProfile.jsx` ⚠️ Migrar a TS

#### API/Servicios
- `api/remote/api.ts` → sección `usuarios` ✅ TypeScript
- `api/userAdmin.ts` ✅ TypeScript

#### Páginas que lo consumen
- `pages/usuarios.jsx`
- `pages/perfil.jsx`
- `pages/estudiantes.jsx` (legacy)
- Sidebar (Layout.jsx)

---

### 📖 Sesiones de Estudio (`/features/estudio`)
**Descripción**: Modo práctica Studia (sesiones activas, cronómetros, bloques)

#### Componentes
- `components/estudio/` (COMPLETO - 13 archivos)
  - `ModalFinalizarSesion.jsx`
  - `ModalCancelar.jsx`
  - `CronometroCompacto.jsx`
  - `TimelineProgreso.jsx`
  - `ResumenFinal.jsx`
  - `ItinerarioMini.jsx`
  - `MenuToggleButton.jsx`
  - etc.

#### Hooks
- `hooks/entities/useRegistrosSesion.ts` ✅ TypeScript
- `hooks/entities/useRegistrosBloque.ts` ✅ TypeScript

#### API/Servicios
- `api/remote/sesiones.ts` ✅ TypeScript (completo)
- `services/manualSessionService.js` ⚠️ Migrar a TS

#### Páginas que lo consumen
- `pages/studia.jsx` (página principal)

---

### 🎵 Ejercicios / Bloques / Piezas (`/features/curriculo`)
**Descripción**: Catálogo de ejercicios, bloques y piezas musicales

#### Componentes
- `components/editor/` (COMPLETO - 8 archivos)
  - `BloquesTab.jsx`
  - `EjerciciosTab.jsx`
  - `PiezasTab.jsx`
  - `PlanesTab.jsx`
  - `ExerciseEditor.jsx`
  - `PieceEditor.jsx`
  - `PlanEditor.jsx`
  - `WeekEditor.jsx`

#### Hooks
- `hooks/entities/useBloques.ts` ✅ TypeScript
- `hooks/useExerciseVariations.js` ⚠️ Migrar a TS

#### API/Servicios
- `api/remote/bloques.ts` ✅ TypeScript
- `api/remote/piezas.ts` ✅ TypeScript
- `api/remote/planes.ts` ✅ TypeScript

#### Páginas que lo consumen
- `pages/planes.jsx`
- `pages/piezas.jsx`
- `pages/sesiones.jsx`
- `pages/semanas.jsx`
- `pages/semana.jsx`

---

### 📊 Progreso / Estadísticas / Habilidades (`/features/progreso`)
**Descripción**: Visualización de progreso, XP, radar de habilidades, métricas

#### Componentes
- `components/estadisticas/` (COMPLETO - 20+ archivos)
  - `HabilidadesView.tsx` ✅ TypeScript
  - `HabilidadesRadarChart.tsx` ✅ TypeScript
  - `HabilidadesTrabajadas.tsx` ✅ TypeScript
  - `EvolucionPPMChart.tsx` ✅ TypeScript
  - `TotalXPDisplay.tsx` ✅ TypeScript
  - `ResumenTab.jsx`
  - `ProgresoTab.jsx`
  - `EvaluacionesTab.jsx`
  - `FeedbackTab.jsx`
  - `FeedbackUnificadoTab.jsx`
  - `AutoevaluacionesTab.jsx`
  - `TopEjerciciosTab.jsx`
  - `HeatmapActividad.jsx`
  - `ComparativaEstudiantes.jsx`
  - `ProgresoPorPieza.jsx`
  - `StatCard.jsx`, `StatTile.jsx`, `KpiTile.jsx`, `CompactCard.jsx`
  - `StatsDateHeader.jsx`, `StreakMetric.jsx`, `RatingStarsMetric.jsx`
  - Modales: `TopEjercicioModal.jsx`, `ModalDetalleFeedback.jsx`
  - `chartHelpers.js`
  - `hooks/useEstadisticas.js`

#### Hooks
- `hooks/useXP.ts` ✅ TypeScript
- `hooks/useStudentSkillsData.ts` ✅ TypeScript
- `hooks/useStudentSkillsRadar.ts` ✅ TypeScript
- `hooks/useHabilidadesStats.ts` ✅ TypeScript
- `hooks/useEvaluaciones.ts` ✅ TypeScript

#### API/Servicios
- `services/xpService.ts` ✅ TypeScript (completo!)
- `services/backpackService.ts` ✅ TypeScript (completo!)
- `services/backpackDerivedStatus.ts` ✅ TypeScript

#### Páginas que lo consumen
- `pages/progreso.jsx` (hub principal)
- `pages/estadisticas.jsx` (legacy)
- `pages/habilidades.jsx` (legacy)
- `pages/MochilaPage.jsx` (backpack)

---

### 💬 Feedback Semanal (`/features/feedback`)
**Descripción**: Evaluaciones y retroalimentación semanal del profesor

#### Componentes
- `components/calendario/ModalFeedbackSemanal.jsx`
- `components/calendario/EventoFeedback.jsx` 
- `components/calendario/ModalFeedback.jsx`
- Integrado en `components/estadisticas/FeedbackTab.jsx`

#### Hooks
- `hooks/entities/useFeedbacksSemanal.ts` ✅ TypeScript

#### API/Servicios
- `api/remote/feedbacksSemanal.ts` ✅ TypeScript

#### Páginas que lo consumen
- `pages/cuaderno.jsx`
- `pages/semana.jsx`
- `pages/progreso.jsx`
- `pages/calendario.jsx`

---

### 🗓️ Calendario (`/features/calendario`)
**Descripción**: Vista de calendario con eventos de sesiones, feedback, asignaciones

#### Componentes
- `components/calendario/` (COMPLETO - 13 archivos)
  - `VistaMes.jsx`, `VistaSemana.jsx`, `VistaLista.jsx`
  - `EventoAsignacion.jsx`, `EventoFeedback.jsx`, `EventoSesion.jsx`, `EventoImportante.jsx`
  - `ModalAsignacion.jsx`, `ModalFeedback.jsx`, `ModalSesion.jsx`, `ModalFeedbackSemanal.jsx`
  - `ModalCrearEvento.jsx`, `ModalEventoResumen.jsx`
  - `utils.js`

#### Hooks
- Ninguno específico (usa hooks de otros dominios)

#### API/Servicios
- RPC `get_calendar_summary` (Supabase)

#### Páginas que lo consumen
- `pages/calendario.jsx`

---

### 🎒 Mochila (Backpack) (`/features/mochila`)
**Descripción**: Sistema de progreso de ejercicios individuales del estudiante

#### Componentes
- Integrado en `MochilaPage.jsx`

#### Hooks
- `hooks/useStudentBackpack.ts` ✅ TypeScript

#### API/Servicios
- `services/backpackService.ts` ✅ TypeScript (completo!)
- `services/backpackDerivedStatus.ts` ✅ TypeScript

#### Páginas que lo consumen
- `pages/MochilaPage.jsx`

---

### 🛟 Soporte / Tickets (`/features/soporte`)
**Descripción**: Sistema de tickets de soporte técnico

#### Componentes
- `components/soporte/` (varios)
- `components/common/SupportTicketsBadge.tsx` ✅ TypeScript

#### Hooks
- `hooks/usePendingSupportTicketsCount.ts` ✅ TypeScript

#### API/Servicios
- `data/supportTicketsClient.ts` ✅ TypeScript

#### Páginas que lo consumen
- `pages/soporte.jsx`
- `pages/soporte-prof.jsx`

---

### 🛠️ Admin / Configuración (`/features/admin`)
**Descripción**: Panel de administración, configuración, imports, tests

#### Componentes
- `components/admin/LevelConfigView.jsx`
- `pages/admin/` (varios)
  - `configuracion.jsx`
  - `AppVersionContent.jsx`
  - `DesignContent.jsx`
  - `ImportExportContent.jsx`
  - `MultimediaContent.jsx`
  - `TestSeedContent.jsx`
  - `maintenance/` (varios)

#### Hooks
- `hooks/entities/useLevelsConfig.ts` ✅ TypeScript
- `hooks/useAppVersion.js` ⚠️ Migrar a TS
- `hooks/useErrorReportsCount.ts` ✅ TypeScript

#### API/Servicios
- `api/appDataAPI.ts` ✅ TypeScript
- `api/errorReportsAPI.ts` ✅ TypeScript
- `features/importExport/services/` y `components/`

#### Páginas que lo consumen
- `pages/admin/configuracion.jsx` (hub)
- `pages/reportes.jsx`
- `pages/audit.jsx`

---

### 🔐 Auth (`/features/auth`)
**Descripción**: Autenticación, roles, invitaciones

#### Componentes
- `components/auth/` (6 archivos)
  - `PublicRoute.jsx`
  - `RequireAuth.jsx`
  - `RequireRole.jsx`
  - `RoleBootstrap.jsx`
  - `roleMap.jsx`
- `pages/auth/` (9 archivos)
  - `LoginPage.jsx`
  - `InvitationPage.jsx`
  - `ResetPasswordPage.jsx`
  - `components/` (varios modales y forms)
  - `hooks/` (6 archivos)
  - `config/` (2 archivos)
  - `utils/validation.js`

#### Hooks
- `auth/useRealUser.jsx` (puede moverse a providers)

#### API/Servicios
- `auth/AuthProvider.jsx` → mover a `providers/`
- `auth/authUserCache.ts` ✅ TypeScript
- `lib/authHelpers.ts` ✅ TypeScript
- `lib/authPasswordHelpers.ts` ✅ TypeScript

#### Páginas que lo consumen
- Todas las páginas (RequireAuth wrapper)

---

### 📚 Biblioteca / Plantillas (`/features/biblioteca`)
**Descripción**: Gestión de templates y contenido predefinido

#### Componentes
- Integrado en páginas y modales

#### Hooks
- Ninguno específico

#### API/Servicios
- Usa API de piezas/planes

#### Páginas que lo consumen
- `pages/biblioteca.jsx`

---

### 🎥 Multimedia / Media (`/features/media`)
**Descripción**: Gestión de links de YouTube, archivos media, previsualizaciones

#### Componentes
- `components/common/` (varios):
  - `MediaEmbed.jsx`
  - `MediaViewer.jsx`
  - `MediaLinksBadges.jsx`
  - `MediaLinksInput.jsx`
  - `MediaPreviewModal.jsx`
  - `MediaIconButton.jsx`
  - `AudioPlayer.jsx`
  - `CustomAudioPlayer.jsx`
  - `SimpleLightbox.jsx`

#### Hooks
- Ninguno específico

#### API/Servicios
- `lib/storageUpload.ts` ✅ TypeScript

#### Páginas que lo consumen
- Múltiples (editor, studia, contenido-multimedia)

---

### 🔔 Evaluaciones Técnicas (`/features/evaluaciones`)
**Descripción**: Evaluaciones técnicas de profesor

#### Componentes
- `components/evaluaciones/` (varios)
  - `EvaluacionForm.tsx` ✅ TypeScript
  - `CurrentXPInline.tsx` ✅ TypeScript

#### Hooks
- `hooks/entities/useEvaluacionesTecnicas.ts` ✅ TypeScript

#### API/Servicios
- `data/evaluacionesClient.ts` ✅ TypeScript

#### Páginas que lo consumen
- `pages/cuaderno.jsx`
- `pages/progreso.jsx`

---

## 2. 🔄 Dependencias Cruzadas y Acoplamiento

### Hooks Compartidos (múltiples dominios)

| Hook | Dominios | Complejidad | Decisión |
|------|----------|-------------|----------|
| `useAuth` | TODOS | Alta | ✅ Mantener en `/auth` |
| `useEffectiveUser` | TODOS | Alta | ✅ Mantener en `/auth` |
| `useCurrentProfile` | TODOS | Media | ✅ Mantener en `/hooks` shared |
| `useMobile` / `useMobileStrict` | UI | Baja | ➡️ Mover a `/shared/hooks` |
| `useMediaQuery` | UI | Baja | ➡️ Mover a `/shared/hooks` |
| `useHotkeysModal` | Global | Baja | ✅ Mantener en `/hooks` shared |

### Componentes Compartidos (múltiples dominios)

| Componente | Uso | Decisión |
|------------|-----|----------|
| `PerfilModal` | Users, Layout | ✅ Mantener en `/components/common` |
| `ReportErrorButton` | Global | ✅ Mantener en `/components/common` |
| `PeriodHeader` | Calendario, Stats | ✅ Mantener en `/components/common` |
| `LevelBadge` | Users, Stats | ✅ Mantener en `/components/common` |
| `UnifiedTable` | Admin, Multiple | ✅ Mantener en `/components/tables` |
| `ClickableContainer` | UI | ➡️ Mover a `/components/ui` |

### Servicios Acoplados

| Servicio | Acoplamiento | Riesgo | Acción |
|----------|-------------|--------|--------|
| `xpService.ts` | Bajo (self-contained) | ✅ Bajo | Mantener en `services/` (platform-agnostic) |
| `backpackService.ts` | Bajo (self-contained) | ✅ Bajo | Mantener en `services/` (platform-agnostic) |
| `manualSessionService.js` | Medio (usa localDataClient) | ⚠️ Medio | Migrar a TS y refactorizar |

### Paquetes que pueden moverse SIN romper referencias

✅ **Listo para mover ahora:**

1. **`/features/auth`** → Ya está modularizado
2. **`/features/estadisticas`** → Altamente cohesionado
3. **`/components/estudio`** → Totalmente independiente
4. **`/components/calendario`** → Solo usa hooks de otros dominios (OK)
5. **`services/xpService.ts`** → Ya platform-agnostic
6. **`services/backpackService.ts`** → Ya platform-agnostic

⚠️ **Requiere preparación:**

1. **Asignaciones** → Migrar componentes jsx a tsx primero
2. **Editor (curriculo)** → Migrar jsx a tsx primero
3. **Media components** → Consolidar y definir API
4. **Admin/Config** → Separar maintenance de config primero

---

## 3. 🧠 Clasificación por Tipo

### Componentes Genéricos (UI) → `/components/ui` o `/shared/components`

**Candidatos inmediatos:**
- `components/ui/` (YA ES shadcn UI) ✅
  - `button.tsx`
  - `checkbox.tsx`
  - `input.tsx`
  - `label.tsx`
  - `separator.tsx`
  - `slider.tsx`
  - `textarea.tsx`
  - `tooltip.tsx`

**Migrar de `common/` a `/shared/components`:**
- `ClickableContainer.jsx`
- `ErrorBoundary.jsx`
- `GlobalErrorReportHandler.jsx`
- `SimpleLightbox.jsx`

### Componentes Específicos → `/features/<dominio>/components/`

**Ya organizados:**
- ✅ `/components/estudio/` → `/features/estudio/components/`
- ✅ `/components/estadisticas/` → `/features/progreso/components/`
- ✅ `/components/calendario/` → `/features/calendario/components/`
- ✅ `/components/editor/` → `/features/curriculo/components/`
- ✅ `/components/evaluaciones/` → `/features/evaluaciones/components/`

**Requieren reorganización:**
- `/components/asignaciones/` → Está disperso, consolidar en `/features/asignaciones/components/`
- `/components/estudiantes/` → Mover a `/features/usuarios/components/estudiantes/`
- `/components/soporte/` → Mover a `/features/soporte/components/`

### Hooks Reutilizables vs. Contextuales

**Hooks Genéricos** → `/shared/hooks`:
- `useMobile.jsx` ⚠️ → migrar a TS
- `useMobileStrict.js` ⚠️ → migrar a TS
- `useMediaQuery.jsx` ⚠️ → migrar a TS
- `useDockToFooterOffset.js` ⚠️ → migrar a TS

**Hooks Contextuales** → `/features/<dominio>/hooks`:
- Ya están bien organizados en `hooks/entities/`
- Mantener estructura actual

---

## 4. 🟨 Estado de Migración a TypeScript

### Resumen Global

| Tipo | Total | TypeScript | JavaScript | % Migrado |
|------|-------|------------|------------|-----------|
| Hooks | 24 | 14 | 10 | **58%** |
| Componentes | 164 | 17 | 147 | **10%** |
| Páginas | 76 | 0 | 76 | **0%** |
| API/Services | 21 | 18 | 3 | **86%** |

### Dominios por Nivel de Migración TS

#### 🟢 Alto (>70% TypeScript)

1. **API Layer** → 86% ✅
   - `api/remote/` completamente en TS
   - Solo faltan: `manualSessionService.js`

2. **Services** → 75% ✅
   - `xpService.ts` ✅
   - `backpackService.ts` ✅
   - `backpackDerivedStatus.ts` ✅
   - Falta: `manualSessionService.js`

3. **Hooks de Entidades** → 100% ✅
   - Todos los `hooks/entities/*.ts` ya están en TypeScript

#### 🟡 Medio (30-70% TypeScript)

4. **Hooks Compartidos** → 42%
   - ✅ TS: `useXP.ts`, `useStudentBackpack.ts`, `useHabilidadesStats.ts`, `useEvaluaciones.ts`, etc.
   - ⚠️ JS: `useMobile.jsx`, `useMediaQuery.jsx`, `useCurrentProfile.jsx`, `useExerciseVariations.js`

5. **Componentes de Estadísticas** → 25%
   - ✅ TS: `HabilidadesView.tsx`, `HabilidadesRadarChart.tsx`, `TotalXPDisplay.tsx`, `EvolucionPPMChart.tsx`
   - ⚠️ JS: Resto de tabs y modales

#### 🔴 Bajo (<30% TypeScript)

6. **Componentes de Estudio** → 0%
   - TODO: Migrar completo `components/estudio/`

7. **Componentes de Editor** → 0%
   - TODO: Migrar completo `components/editor/`

8. **Componentes de Calendario** → 0%
   - TODO: Migrar completo `components/calendario/`

9. **Componentes de Asignaciones** → 0%
   - TODO: Migrar completo `components/asignaciones/`

10. **Páginas** → 0%
    - TODAS las páginas están en `.jsx`
    - Requiere migración masiva

### Archivos Críticos que Requieren Migración

**Prioridad ALTA:**
```
hooks/useCurrentProfile.jsx
hooks/useExerciseVariations.js
hooks/useMobile.jsx
hooks/useMediaQuery.jsx
services/manualSessionService.js
```

**Prioridad MEDIA (componentes core):**
```
components/estudio/*.jsx (13 archivos)
components/editor/*.jsx (8 archivos)
components/asignaciones/*.jsx (6 archivos)
```

**Prioridad BAJA (páginas - migrar al final):**
```
pages/*.jsx (76 archivos)
```

---

## 5. ⚙️ Infraestructura Reusable para React Native

### ✅ Ya Platform-Agnostic (listo para compartir)

#### Servicios
- `services/xpService.ts` ✅ (solo usa dataClient abstracto)
- `services/backpackService.ts` ✅ (solo usa dataClient abstracto)
- `services/backpackDerivedStatus.ts` ✅

#### API Layer
- `api/remote/` completo ✅ (usa Supabase JS, funciona en RN)
- `api/appDataAPI.ts` ✅ (interface abstracta)
- `api/dataClient.ts` ✅
- `api/entities.ts` ✅

#### Utils
- `utils/dateHelpers.js`
- `utils/mathHelpers.js` (si existen)
- `lib/queryKeys.ts` ✅

### ⚠️ Requiere Adaptación para React Native

#### Componentes UI (crear versión RN)
- `components/ui/` → crear `/shared/ui-native/`
- Todos los componentes `.jsx` → crear equivalentes con React Native components

#### Hooks Web-Específicos (crear versión RN)
- `useMobile.jsx` → usar `Dimensions` de RN
- `useMediaQuery.jsx` → usar `useWindowDimensions` de RN
- `useDockToFooterOffset.js` → no aplicable en RN

#### Storage/Cache
- `localStorage` → migrar a `AsyncStorage` (React Native)
- `sessionStorage` → migrar a in-memory cache o `AsyncStorage`

### 📦 Propuesta de Estructura `/shared`

```
/shared
  /api              # API clients (Supabase, REST)
  /services         # Business logic (XP, Backpack, etc.) ✅
  /hooks            # Platform-agnostic hooks
  /utils            # Helpers (date, math, etc.)
  /types            # TypeScript types ✅
  /constants        # App constants
```

**Qué mover a `/shared` HOY:**
1. ✅ `services/xpService.ts`
2. ✅ `services/backpackService.ts`
3. ✅ `services/backpackDerivedStatus.ts`
4. ✅ `api/remote/` (completo)
5. ✅ `types/domain.ts`
6. ✅ `lib/queryKeys.ts`
7. ⚠️ `utils/` (revisar dependencias)

**Qué mantener en `/src` (web-specific):**
1. Todos los componentes `.jsx/.tsx`
2. Hooks de UI (`useMobile`, `useMediaQuery`)
3. Routing (`Router.jsx`)
4. Layout web (`Layout.jsx`)

---

## 6. 📊 Resumen y Recomendaciones

### Estado Actual

| Métrica | Estado |
|---------|--------|
| **Componentes** | 164 archivos, 10% en TS |
| **Hooks** | 24 archivos, 58% en TS |
| **Páginas** | 76 archivos, 0% en TS |
| **API/Services** | 21 archivos, 86% en TS ✅ |
| **Dominios identificados** | 14 dominios |
| **Features existentes** | 1 (`/features/importExport`) |

### Features Listos para Modularizar (AHORA)

#### ✅ Fase 1 - Sin Dependencias Bloqueantes

1. **`/features/estudio`** ⭐ PRIORIDAD
   - 13 componentes cohesionados
   - Hook específico: `useRegistrosSesion.ts` ✅
   - API: `api/remote/sesiones.ts` ✅
   - Solo 1 página: `studia.jsx`
   - **Acción**: Crear carpeta, mover componentes, actualizar imports

2. **`/features/progreso`** ⭐ PRIORIDAD
   - 20+ componentes estadísticas
   - 5 hooks TypeScript ✅
   - Services: `xpService.ts`, `backpackService.ts` ✅
   - **Acción**: Consolidar estadísticas + XP + mochila

3. **`/features/calendario`**
   - 13 componentes independientes
   - Sin hooks propios (usa otros dominios)
   - **Acción**: Mover componentes, mantener imports externos

#### ⚠️ Fase 2 - Requiere Migración TS Primero

4. **`/features/asignaciones`**
   - ✅ API en TS
   - ✅ Hook en TS
   - ⚠️ 6 componentes en JSX
   - **Acción**: Migrar componentes a TS → Modularizar

5. **`/features/curriculo`**
   - ✅ API en TS (bloques, piezas, planes)
   - ⚠️ 8 componentes editor en JSX
   - **Acción**: Migrar componentes a TS → Modularizar

6. **`/features/feedback`**
   - ✅ API en TS
   - ✅ Hook en TS
   - ⚠️ 3 componentes en JSX
   - **Acción**: Migrar componentes a TS → Modularizar

### Orden de Migración Recomendado

#### 🚀 Sprint 1 (Preparación)
1. Migrar hooks críticos a TS:
   - `useCurrentProfile.jsx` → `.ts`
   - `useMobile.jsx` → `.ts`
   - `useMediaQuery.jsx` → `.ts`
   - `useExerciseVariations.js` → `.ts`
   - `services/manualSessionService.js` → `.ts`

2. Crear estructura `/shared`:
   ```bash
   mkdir -p shared/{api,services,hooks,utils,types,constants}
   ```

#### 🏗️ Sprint 2 (Modularización Fase 1)
3. Modularizar `features/estudio`:
   - Mover `components/estudio/*` → `features/estudio/components/`
   - Mover `hooks/useRegistrosSesion.ts` → `features/estudio/hooks/`
   - Actualizar imports en `studia.jsx`

4. Modularizar `features/progreso`:
   - Mover `components/estadisticas/*` → `features/progreso/components/`
   - Mover hooks XP/skills → `features/progreso/hooks/`
   - Mover services XP → `shared/services/` (platform-agnostic)

5. Modularizar `features/calendario`:
   - Mover `components/calendario/*` → `features/calendario/components/`

#### 🔧 Sprint 3 (Migración TS + Modularización Fase 2)
6. Migrar `components/asignaciones/*` a TS
7. Modularizar `features/asignaciones`
8. Migrar `components/editor/*` a TS
9. Modularizar `features/curriculo`

#### 🎯 Sprint 4 (Consolidación)
10. Crear `/shared` completo:
    - Mover services platform-agnostic
    - Mover API layer
    - Mover types
    - Documentar API contracts

11. Preparar para React Native:
    - Definir interface UI components
    - Crear native equivalents roadmap
    - Testing platform-agnostic services

### Cambios Seguros de Aplicar HOY

✅ **Sin riesgo - Puedes ejecutar ahora:**

```bash
# 1. Crear estructura shared
mkdir -p shared/{api,services,hooks,utils,types}

# 2. Mover services platform-agnostic
mv src/services/xpService.ts shared/services/
mv src/services/backpackService.ts shared/services/
mv src/services/backpackDerivedStatus.ts shared/services/

# 3. Mover types
mv src/types/domain.ts shared/types/

# 4. Actualizar imports (buscar/reemplazar en IDE)
# "@/services/xpService" → "@/shared/services/xpService"
# "@/types/domain" → "@/shared/types/domain"
```

⚠️ **Requiere testing - Ejecutar con precaución:**

```bash
# 5. Crear features estudio
mkdir -p features/estudio/{components,hooks}
cp -r src/components/estudio/* features/estudio/components/
# Actualizar imports en studia.jsx manualmente
```

### Compatibilidad con Realtime/Websockets

**Dominios que benefician de realtime:**

| Dominio | Eventos Realtime | Prioridad |
|---------|------------------|-----------|
| Sesiones Studia | `session:updated`, `block:completed` | ⭐ ALTA |
| Asignaciones | `assignment:created`, `assignment:updated` | ⭐ ALTA |
| Feedback | `feedback:created` | 🟡 MEDIA |
| Calendario | `event:created`, `event:updated` | 🟡 MEDIA |
| Soporte | `ticket:created`, `message:sent` | 🟢 BAJA |

**Preparación para Websockets:**

1. ✅ API Layer ya usa Supabase (tiene Realtime built-in)
2. ⚠️ Crear hooks `useRealtimeSubscription` genérico
3. ⚠️ Integrar en `features/estudio` (sesiones collaborative)
4. ⚠️ Integrar en `features/asignaciones` (notificaciones profesor)

---

## 🎯 Plan de Acción Recomendado

### HOY (cambios seguros):
1. ✅ Crear `/shared` y mover services platform-agnostic
2. ✅ Migrar `useCurrentProfile.jsx` → `.ts`
3. ✅ Documentar este análisis en `/docs/architecture/`

### SEMANA 1 (preparación):
4. Migrar hooks críticos a TS
5. Modularizar `features/estudio` (componentes + hooks)
6. Modularizar `features/progreso` (estadísticas + XP)

### SEMANA 2 (consolidación):
7. Modularizar `features/calendario`
8. Migrar `components/asignaciones` a TS
9. Modularizar `features/asignaciones`

### SEMANA 3 (React Native prep):
10. Completar `/shared` con todos los services
11. Crear roadmap UI components para RN
12. Definir API contracts platform-agnostic

### SEMANA 4 (WebSockets):
13. Crear `useRealtimeSubscription` hook
14. Integrar realtime en `features/estudio`
15. Integrar realtime en `features/asignaciones`

---

## 📚 Recursos Adicionales

### Estructura Propuesta Final

```
studia-local/
├── src/                    # Web-specific
│   ├── pages/
│   ├── components/
│   │   ├── ui/            # shadcn (mantener)
│   │   └── common/        # shared UI (revisar)
│   ├── hooks/             # Web-specific hooks
│   ├── auth/              # Auth provider (web)
│   └── Router.jsx
├── shared/                 # Platform-agnostic
│   ├── api/               # Supabase client, remote API
│   ├── services/          # Business logic (XP, Backpack)
│   ├── hooks/             # Platform-agnostic hooks
│   ├── utils/             # Helpers
│   ├── types/             # TypeScript definitions
│   └── constants/
└── features/               # Domain modules
    ├── estudio/
    │   ├── components/
    │   ├── hooks/
    │   └── index.ts
    ├── progreso/
    │   ├── components/
    │   ├── hooks/
    │   └── index.ts
    ├── asignaciones/
    ├── calendario/
    ├── curriculo/
    ├── feedback/
    ├── usuarios/
    ├── soporte/
    ├── evaluaciones/
    ├── mochila/
    └── auth/
```

### Referencias

- [Feature-Sliced Design](https://feature-sliced.design/)
- [React Native Web Compatibility](https://necolas.github.io/react-native-web/)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

---

**Generado el**: 2025-12-27  
**Versión**: 1.0  
**Estado**: ✅ Completo y listo para ejecución
