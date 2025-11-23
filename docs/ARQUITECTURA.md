# Arquitectura Técnica - Studia

Documentación técnica sobre la arquitectura y estructura del proyecto Studia.

## Visión General

Studia es una aplicación web construida con React y Vite que puede funcionar en dos modos:

- **Modo Local**: Persistencia en `localStorage`, sin servidor (ideal para desarrollo y pruebas)
- **Modo Remoto**: Persistencia en Supabase (Auth + Database), para producción

### Stack Tecnológico

- **Frontend**: React 18 + Vite 6
- **UI**: Tailwind CSS + Radix UI + Lucide Icons
- **Estado**: TanStack Query (React Query) para gestión de datos y caché
- **Routing**: React Router v7
- **Backend**: Supabase (Auth + PostgreSQL con RLS)
- **Diseño**: Sistema de diseño runtime con DesignProvider

## Estructura de Carpetas

```
src/
├── pages/              # Páginas principales (hoy, semana, asignaciones, etc.)
├── components/         # Componentes reutilizables
│   ├── common/         # Componentes comunes (PeriodHeader, HotkeysModal, etc.)
│   ├── ds/             # Componentes del sistema de diseño (PageHeader, Button, etc.)
│   ├── ui/             # Componentes base de Radix UI
│   ├── estudio/        # Componentes específicos del modo estudio
│   ├── estadisticas/   # Componentes de estadísticas
│   └── ...
├── hooks/              # Custom hooks (use-mobile, useHotkeysModal, etc.)
├── utils/              # Utilidades (hotkeys, log, etc.)
├── api/                # Clientes de datos (localDataAPI, remoteDataAPI, etc.)
├── data/               # Capa de datos local (clientes CRUD por entidad)
├── design/             # Sistema de diseño (tokens, estilos, componentes)
├── auth/               # Autenticación (AuthProvider, componentes de auth)
├── providers/          # Providers de React (DataProvider, DesignProvider)
└── types/              # Tipos TypeScript compartidos (domain.ts)
```

## Capa de Datos

La aplicación utiliza una capa de datos desacoplada de la UI que permite cambiar entre modo local y remoto sin tocar los componentes.

### Modo Local (`VITE_DATA_SOURCE=local`)

#### Arquitectura

- **`localStorageClient.js`** (único punto que toca `localStorage`):
  - `loadFromStorage()`, `saveToStorage(data)`
  - `getEntity(name)`, `setEntity(name, items)`
  - `createItem(name, item)`, `updateItem(name, id, updates)`, `deleteItem(name, id)`
  - `bootstrapFromSnapshot(snapshot)` para inicializar desde un seed
  - Usa `STORAGE_KEY = 'studia_data'` y versión interna

- **Clientes por entidad** (`src/data/*Client.js`):
  - `asignacionesClient.js`, `planesClient.js`, `piezasClient.js`, `bloquesClient.js`
  - `registrosSesionClient.js`, `registrosBloqueClient.js`, `feedbacksSemanalClient.js`
  - `usuariosClient.js`, `authClient.js`
  - Encapsulan operaciones CRUD por entidad, delegando en `localStorageClient`
  - API pública pensada para ser intercambiable por una API remota

- **`LocalDataProvider`** (`src/local-data/LocalDataProvider.jsx`):
  - Carga datos de `studia_data` al iniciar
  - Si no existen, siembra desde `rebuildAllLocalData()` y migra a `studia_data` con `bootstrapFromSnapshot()`
  - Inyecta los datos en memoria con `setLocalDataRef(...)` para mantener compatibilidad

- **`localDataClient.js`** (`src/api/localDataClient.js`):
  - Mantiene la API usada por la UI (`auth`, `entities.X`) pero delega en los clientes de `src/data/*`
  - No toca `localStorage` directamente

### Modo Remoto (`VITE_DATA_SOURCE=remote`)

- **`remoteDataAPI.ts`** (`src/api/remoteDataAPI.ts`):
  - Implementa la misma interfaz pública que `localDataAPI`
  - Usa Supabase client para hacer peticiones HTTP a la base de datos
  - Maneja mapeo automático entre camelCase (frontend) y snake_case (Supabase)
  - Gestiona autenticación y sesiones automáticamente

- **`DataProvider`** (`src/providers/DataProvider.tsx`):
  - Factory que elige entre `LocalDataProvider` y `RemoteDataProvider` según `VITE_DATA_SOURCE`
  - Expone hooks `useData()` y `useDataEntities()` para acceso a la API

### Contratos CRUD por Entidad

Todas las entidades siguen el mismo patrón:

```js
// Ejemplo: Asignaciones
import { localDataClient } from '@/api/localDataClient';

// Leer todo
const asignaciones = await localDataClient.entities.Asignacion.list();

// Leer uno
const asignacion = await localDataClient.entities.Asignacion.get(id);

// Crear
const nueva = await localDataClient.entities.Asignacion.create({
  alumnoId, profesorId, piezaId, semanaInicioISO, ...
});

// Actualizar
const actualizada = await localDataClient.entities.Asignacion.update(id, {
  notas: '...', estado: 'publicada'
});

// Borrar
await localDataClient.entities.Asignacion.delete(id);
```

**Entidades disponibles**: `Asignacion`, `Bloque`, `Plan`, `Pieza`, `RegistroSesion`, `RegistroBloque`, `FeedbackSemanal`, `User`.

### Migración Futura

1. Crear clientes HTTP (ej. `asignacionesHttpClient.js`) con la misma interfaz pública
2. Usar `VITE_DATA_SOURCE` para elegir entre `local` o `remote` sin tocar la UI
3. Mantener las firmas existentes: `getAllX()`, `createX()`, `updateX()`, `deleteX()`
4. Si la estructura de datos cambia, versionar `STORAGE_KEY` para forzar migraciones

## Base de Datos Supabase

### Tablas Principales

#### 1. `profiles`
Extiende `auth.users` con información de perfil específica de Studia.

**Campos principales**:
- `id` (UUID, PK, FK a auth.users.id)
- `full_name` (TEXT)
- `role` (TEXT: 'ADMIN', 'PROF', 'ESTU')
- `profesor_asignado_id` (UUID, nullable, FK a profiles.id)
- `is_active` (BOOLEAN)
- `created_at`, `updated_at` (TIMESTAMPTZ)

#### 2. `piezas`
Almacena las piezas musicales que los estudiantes practican.

**Campos principales**:
- `id` (TEXT, PK)
- `nombre` (TEXT)
- `descripcion` (TEXT, nullable)
- `nivel` (TEXT: 'principiante', 'intermedio', 'avanzado')
- `tiempo_objetivo_seg` (INTEGER)
- `elementos` (JSONB) - Array de `{nombre, mediaLinks[]}`
- `profesor_id` (TEXT)
- `created_at`, `updated_at` (TIMESTAMPTZ)

#### 3. `bloques`
Almacena los ejercicios/bloques de práctica.

**Campos principales**:
- `id` (TEXT, PK)
- `nombre` (TEXT)
- `code` (TEXT, UNIQUE) - Código único (ej: CA-0001) - **Importante para importación**
- `tipo` (TEXT: 'CA', 'CB', 'TC', 'TM', 'FM', 'VC', 'AD')
- `duracion_seg` (INTEGER)
- `instrucciones` (TEXT, nullable)
- `indicador_logro` (TEXT, nullable)
- `materiales_requeridos` (JSONB) - Array de strings
- `media_links` (JSONB) - Array de strings
- `elementos_ordenados` (JSONB) - Array de strings
- `pieza_ref_id` (TEXT, nullable)
- `profesor_id` (TEXT)
- `created_at`, `updated_at` (TIMESTAMPTZ)

#### 4. `planes`
Almacena los planes de práctica con estructura anidada.

**Campos principales**:
- `id` (TEXT, PK)
- `nombre` (TEXT)
- `foco_general` (TEXT: 'GEN', 'LIG', 'RIT', 'ART', 'S&A')
- `objetivo_semanal_por_defecto` (TEXT, nullable)
- `pieza_id` (TEXT)
- `profesor_id` (TEXT)
- `semanas` (JSONB) - Estructura anidada completa (Plan → Semanas → Sesiones → Ejercicios)
- `created_at`, `updated_at` (TIMESTAMPTZ)

#### 5. `asignaciones`
Almacena las asignaciones de práctica con snapshots embebidos.

**Campos principales**:
- `id` (TEXT, PK)
- `alumno_id` (TEXT)
- `profesor_id` (TEXT)
- `pieza_id` (TEXT)
- `semana_inicio_iso` (DATE) - Formato YYYY-MM-DD
- `estado` (TEXT: 'borrador', 'publicada', 'archivada')
- `foco` (TEXT: 'GEN', 'LIG', 'RIT', 'ART', 'S&A')
- `notas` (TEXT, nullable)
- `plan` (JSONB) - Snapshot completo del plan (para preservar versiones históricas)
- `pieza_snapshot` (JSONB) - Snapshot completo de la pieza
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Nota importante**: Los snapshots (`plan`, `pieza_snapshot`) permiten que las asignaciones funcionen incluso si se eliminan o modifican las piezas/planes originales.

#### 6. `registros_sesion`
Almacena los registros de sesiones de práctica completas.

**Campos principales**:
- `id` (TEXT, PK)
- `asignacion_id` (TEXT)
- `alumno_id` (TEXT)
- `profesor_asignado_id` (TEXT)
- `semana_idx` (INTEGER)
- `sesion_idx` (INTEGER)
- `inicio_iso` (TIMESTAMPTZ)
- `fin_iso` (TIMESTAMPTZ, nullable)
- `duracion_real_seg` (INTEGER)
- `duracion_objetivo_seg` (INTEGER)
- `bloques_totales` (INTEGER)
- `bloques_completados` (INTEGER)
- `bloques_omitidos` (INTEGER)
- `finalizada` (BOOLEAN)
- `fin_anticipado` (BOOLEAN)
- `motivo_fin` (TEXT, nullable)
- `calificacion` (INTEGER, nullable, 1-4)
- `notas` (TEXT, nullable)
- `dispositivo` (TEXT, nullable)
- `version_schema` (TEXT, nullable)
- `pieza_nombre`, `plan_nombre`, `semana_nombre`, `sesion_nombre` (TEXT, nullable) - Snapshots
- `foco` (TEXT, nullable)
- `created_at` (TIMESTAMPTZ)

#### 7. `registros_bloque`
Almacena los registros detallados de cada bloque/ejercicio ejecutado.

**Campos principales**:
- `id` (TEXT, PK)
- `registro_sesion_id` (TEXT)
- `asignacion_id` (TEXT)
- `alumno_id` (TEXT)
- `semana_idx` (INTEGER)
- `sesion_idx` (INTEGER)
- `orden_ejecucion` (INTEGER)
- `tipo` (TEXT: 'CA', 'CB', 'TC', 'TM', 'FM', 'VC', 'AD')
- `code` (TEXT)
- `nombre` (TEXT)
- `duracion_objetivo_seg` (INTEGER)
- `duracion_real_seg` (INTEGER)
- `estado` (TEXT: 'completado', 'omitido')
- `inicios_pausa` (INTEGER)
- `inicio_iso` (TIMESTAMPTZ)
- `fin_iso` (TIMESTAMPTZ, nullable)
- `created_at` (TIMESTAMPTZ)

#### 8. `feedbacks_semanal`
Almacena los feedbacks semanales de profesores a estudiantes.

**Campos principales**:
- `id` (TEXT, PK)
- `alumno_id` (TEXT)
- `profesor_id` (TEXT)
- `semana_inicio_iso` (DATE) - Formato YYYY-MM-DD
- `nota_profesor` (TEXT)
- `media_links` (JSONB) - Array de strings
- `created_at`, `updated_at` (TIMESTAMPTZ)

**Índice único**: `(alumno_id, profesor_id, semana_inicio_iso)` - Solo puede haber un feedback por alumno/profesor/semana.

### Convenciones

- **Nombres de campos**: Frontend usa `camelCase`, Supabase usa `snake_case`. El mapeo automático se hace en `remoteDataAPI.ts`
- **IDs**: Todos los IDs son `TEXT` para mantener compatibilidad, excepto `profiles.id` que es UUID (FK a `auth.users.id`)
- **JSONB**: Estructuras complejas se almacenan como JSONB (ej: `planes.semanas`, `asignaciones.plan`)
- **Timestamps**: `created_at` se genera automáticamente con `NOW()`, `updated_at` se actualiza con triggers

### Scripts SQL

Todos los scripts SQL están en `docs/supabase/schema-*.sql`:
- `schema-piezas.sql`
- `schema-bloques.sql`
- `schema-planes.sql`
- `schema-asignaciones.sql`
- `schema-registros-sesion.sql`
- `schema-registros-bloque.sql`
- `schema-feedbacks-semanal.sql`
- `supabase-schema-users.sql` (para `profiles`)

## Seguridad

### Autenticación

- **Supabase Auth**: Gestiona autenticación (login, logout, sesiones, tokens JWT)
- **Roles**: Tres roles definidos: `ADMIN`, `PROF`, `ESTU`
- **Perfiles**: Cada usuario en `auth.users` tiene un perfil correspondiente en `profiles` con información adicional

### Row Level Security (RLS)

Todas las tablas tienen RLS habilitado con políticas que controlan el acceso según el rol:

- **Estudiantes (ESTU)**: 
  - Pueden leer/crear/actualizar sus propios registros
  - Pueden leer su propio perfil y el de su profesor asignado
  - Pueden leer asignaciones publicadas asignadas a ellos

- **Profesores (PROF)**:
  - Pueden leer registros de sus estudiantes asignados
  - Pueden crear/actualizar asignaciones
  - Pueden leer perfiles de sus estudiantes

- **Administradores (ADMIN)**:
  - Acceso completo a todas las tablas
  - Pueden gestionar usuarios (crear, editar, eliminar)
  - Pueden ver todas las asignaciones y registros

### Flujo de Creación de Usuarios

El sistema soporta dos modos:

1. **Crear directamente**: Admin crea el usuario y se envía email de reset de contraseña
2. **Enviar invitación**: Admin envía invitación y el usuario completa el registro

**Edge Functions**:
- `create-user`: Crea usuarios usando Admin API de Supabase
- `invite-user`: Envía invitaciones por email
- `user-actions`: Acciones sobre usuarios (reset password, magic link, etc.)

Las Edge Functions están en `supabase/functions/*/` y se despliegan con:
```bash
supabase functions deploy <nombre-funcion>
```

## Sistema de Diseño

Studia incluye un sistema de diseño runtime basado en tokens CSS que permite personalizar la apariencia de la aplicación sin recompilar.

### Componentes Principales

- **`designSystem.ts`**: Tokens de referencia (colores, tipografía, espaciado, radios, sombras)
- **`designConfig.ts`**: Genera variables CSS dinámicas a partir de tokens
- **`componentStyles.ts`**: Estilos predefinidos por tipo de componente (botones, cards, inputs, etc.)
- **`DesignProvider`**: Provider de React que gestiona el estado del diseño y aplica variables CSS

### Acceso al Panel de Diseño

Los administradores pueden acceder al panel de diseño en `/design` para:
- Ajustar colores (primario, secundario, fondos, superficies)
- Modificar tipografía (familias, tamaños)
- Cambiar espaciado y densidad
- Personalizar radios y sombras
- Alternar entre tema claro y oscuro

**Nota**: Las personalizaciones son temporales por defecto. Consulta `src/design/README.md` para más detalles técnicos.

## Estado de Migración

La aplicación está diseñada para migrar gradualmente de localStorage a Supabase:

- **Infraestructura lista**: APIs remotas implementadas para todas las entidades
- **Modo dual**: La aplicación puede funcionar en ambos modos usando `VITE_DATA_SOURCE`
- **Compatibilidad**: Los clientes locales y remotos usan la misma interfaz pública

**Estado actual**: Las APIs remotas están implementadas. Falta actualizar componentes individuales para usar `useData()` en lugar de `localDataClient` directamente.

Para más detalles, consulta `docs/migration-status.md`.

## Desarrollo Local

### Setup Inicial

```bash
npm install
npm run dev
```

### Variables de Entorno

```env
# Supabase (requerido para modo remoto)
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key

# Fuente de datos
VITE_DATA_SOURCE=local  # o 'remote'
```

### Datos de Prueba

La aplicación incluye:
- Página `/testseed` para generar datos de prueba
- Seed automático si no hay datos en localStorage (modo local)
- Scripts de verificación de integridad de datos

### Debugging

- **Logs centralizados**: Usa `src/utils/log.js` para logging controlado
- **QA Visual**: Accede a `/design` → Pestaña "QA" para verificaciones automáticas
- **Error Boundary**: Captura errores de React y muestra página de error amigable

## Edge Functions (Supabase)

Las Edge Functions están en `supabase/functions/`:

- **`create-user`**: Crea usuarios desde el panel admin
- **`invite-user`**: Envía invitaciones por email
- **`user-actions`**: Acciones sobre usuarios (reset password, magic link, etc.)
- **`upload-youtube`**: (Si está implementada) Subida de videos a YouTube

Cada función tiene su propio `README.md` con documentación técnica.

## Notas Importantes

- **Snapshots en asignaciones**: Las asignaciones guardan snapshots completos de piezas y planes para preservar versiones históricas
- **Códigos únicos**: Los ejercicios usan `code` (ej: CA-0001) para identificación segura entre sistemas
- **Unidad de tiempo**: La capa de datos trabaja en **segundos**. El formateo a HH h MM min es responsabilidad de la UI
- **IDs como TEXT**: Se mantienen como TEXT para compatibilidad, excepto `profiles.id` que es UUID

