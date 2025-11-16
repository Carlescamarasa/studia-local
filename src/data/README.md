## Capa de datos local (studia_data)

Esta carpeta contiene la capa de acceso a datos local, desacoplada de la UI, que persiste en `localStorage` bajo la clave `studia_data`. Su objetivo es emular una API CRUD real para poder migrar fácilmente a un backend remoto en el futuro sin tocar la UI.

### Arquitectura

- `localStorageClient.js` (único punto que toca `localStorage`):
  - `loadFromStorage()`, `saveToStorage(data)`
  - `getEntity(name)`, `setEntity(name, items)`
  - `createItem(name, item)`, `updateItem(name, id, updates)`, `deleteItem(name, id)`
  - `bootstrapFromSnapshot(snapshot)` para inicializar desde un seed (p. ej. `rebuildLocalData`)
  - Usa `STORAGE_KEY = 'studia_data'` y versión interna

- Clientes por entidad (ej.: `asignacionesClient.js`, `planesClient.js`, etc.):
  - Encapsulan las operaciones CRUD por entidad, delegando en `localStorageClient`
  - API pública pensada para ser intercambiable por una API remota

- `authClient.js`:
  - Gestión del usuario actual (solo almacena el `userId` en `localStorage` de forma centralizada)

### Integración con la app

- `src/local-data/LocalDataProvider.jsx`:
  - Carga datos de `studia_data` al iniciar
  - Si no existen, siembra desde `rebuildAllLocalData()` y migra a `studia_data` con `bootstrapFromSnapshot()`
  - Inyecta los datos en memoria con `setLocalDataRef(...)` para mantener compatibilidad

- `src/api/localDataClient.js`:
  - Mantiene la API usada por la UI (`auth`, `entities.X`) pero delega en los clientes de `src/data/*`
  - No toca `localStorage` directamente

### Contratos CRUD por entidad (ejemplo: Asignaciones)

```js
import { AsignacionesAPI } from '@/data/asignacionesClient';

// Leer todo
const items = AsignacionesAPI.getAllAsignaciones();

// Crear
const created = AsignacionesAPI.createAsignacion({ alumnoId, ... });

// Actualizar
const updated = AsignacionesAPI.updateAsignacion(id, { notas: '...' });

// Borrar
await AsignacionesAPI.deleteAsignacion(id);
```

Para el resto de entidades (`BloquesAPI`, `PlanesAPI`, `PiezasAPI`, `RegistrosSesionAPI`, `RegistrosBloqueAPI`, `FeedbacksSemanalAPI`, `UsuariosAPI`) la forma de uso es análoga.

### Reglas

- Acceso a `localStorage` únicamente desde `localStorageClient.js` o `authClient.js` (para `userId`).
- La UI y la lógica de negocio deben llamar a funciones de `src/data/*` o a `src/api/localDataClient.js`.
- Nunca acceder a `localStorage` directamente desde componentes.

### Migración futura a API remota

1. Crear clientes HTTP (ej. `asignacionesHttpClient.js`) con la misma interfaz pública que los clientes locales.
2. Introducir una factoría o bandera de entorno para elegir entre `local` o `remote` sin tocar la UI:
   - Opción A: Cambiar las importaciones en `src/api/localDataClient.js` para que resuelvan a los clientes remotos.
   - Opción B: Inyectar la implementación (local/remota) desde un contenedor/proveedor de dependencias.
3. Mantener las firmas existentes: `getAllX()`, `createX()`, `updateX()`, `deleteX()`.
4. Si la estructura de datos cambia, versionar `STORAGE_KEY` para forzar migraciones/borrado controlado del storage local.

### Seed y verificación de datos

- `rebuildLocalData.js` y `rebuildAllLocalData()` siguen disponibles para generar datos realistas en local y para reparar inconsistencias (solo en desarrollo).
- `verifyLocalData.js` ahora valida contra `studia_data` en vez de CSV.

### Notas

- La capa trabaja en **segundos** como unidad de tiempo. El formateo a HH h MM min es responsabilidad de la UI.
- `safeNumber` se usa para normalizar valores atípicos; los agregados usan normalización sin límite superior.


