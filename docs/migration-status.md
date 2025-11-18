# Estado de Migración: LocalStorage → Supabase

## Resumen

Este documento rastrea el progreso de la migración de datos desde localStorage a Supabase.

**Última actualización**: 2024-12-19

## Fases Completadas

### ✅ Fase 1: Diseño de Esquema Supabase
- [x] Script SQL para `piezas`
- [x] Script SQL para `bloques`
- [x] Script SQL para `planes`
- [x] Script SQL para `asignaciones`
- [x] Script SQL para `registros_sesion`
- [x] Script SQL para `registros_bloque`
- [x] Script SQL para `feedbacks_semanal`
- [x] Tabla `profiles` ya existía

**Ubicación**: `docs/supabase/schema-*.sql`

### ✅ Fase 2: Contrato de Datos (Tipos TypeScript)
- [x] Tipos completos para todas las entidades en `src/types/domain.ts`
- [x] Tipos Create/Update para cada entidad
- [x] Tipos auxiliares (PiezaElemento, PiezaSnapshot, etc.)

### ✅ Fase 3: AppDataAPI + DataProvider Unificado
- [x] Interfaz `AppDataAPI` en `src/api/appDataAPI.ts`
- [x] Implementación local `createLocalDataAPI()` en `src/api/localDataAPI.ts`
- [x] Implementación remota `createRemoteDataAPI()` en `src/api/remoteDataAPI.ts`
- [x] `DataProvider` unificado en `src/providers/DataProvider.jsx`
- [x] Integrado en `src/App.jsx`
- [x] Hook `useData()` para acceso a la API
- [x] Hook `useDataEntities()` para compatibilidad con código existente

## Fase 4: Migración Entidad por Entidad

### Estado General
Las APIs remotas están implementadas para todas las entidades. Lo que falta es actualizar los componentes para usar `useData()` en lugar de `localDataClient` directamente.

### 4.1 Usuarios/Profiles ✅
- **Estado**: Ya migrado parcialmente
- **Tabla**: `profiles` (ya existe)
- **API Remota**: ✅ Implementada
- **Componentes**: Usa AuthProvider (ya integrado con Supabase)

### 4.2 Piezas ✅
- **Estado**: Infraestructura lista, componentes parcialmente migrados
- **Tabla**: `piezas` (script SQL creado en `docs/supabase/schema-piezas.sql`, pendiente ejecutar en Supabase)
- **API Remota**: ✅ Implementada
- **Componentes**: 
  - ✅ `PiezasTab.jsx` - Migrado a `useDataEntities()`
  - ✅ `PieceEditor.jsx` - Migrado a `useDataEntities()`
  - ⏳ Otros componentes pueden migrarse gradualmente siguiendo el mismo patrón

### 4.3 Bloques ⏳
- **Estado**: Pendiente
- **Tabla**: `bloques` (script SQL creado, pendiente ejecutar en Supabase)
- **API Remota**: ✅ Implementada
- **Componentes**: Pendiente actualizar para usar `useData()`

### 4.4 Planes ⏳
- **Estado**: Pendiente
- **Tabla**: `planes` (script SQL creado, pendiente ejecutar en Supabase)
- **API Remota**: ✅ Implementada
- **Componentes**: Pendiente actualizar para usar `useData()`

### 4.5 Asignaciones ⏳
- **Estado**: Pendiente
- **Tabla**: `asignaciones` (script SQL creado, pendiente ejecutar en Supabase)
- **API Remota**: ✅ Implementada
- **Componentes**: Pendiente actualizar para usar `useData()`

### 4.6 RegistrosSesion ⏳
- **Estado**: Pendiente
- **Tabla**: `registros_sesion` (script SQL creado, pendiente ejecutar en Supabase)
- **API Remota**: ✅ Implementada
- **Componentes**: Pendiente actualizar para usar `useData()`

### 4.7 RegistrosBloque ⏳
- **Estado**: Pendiente
- **Tabla**: `registros_bloque` (script SQL creado, pendiente ejecutar en Supabase)
- **API Remota**: ✅ Implementada
- **Componentes**: Pendiente actualizar para usar `useData()`

### 4.8 FeedbacksSemanal ⏳
- **Estado**: Pendiente
- **Tabla**: `feedbacks_semanal` (script SQL creado, pendiente ejecutar en Supabase)
- **API Remota**: ✅ Implementada
- **Componentes**: Pendiente actualizar para usar `useData()`

## Variables de Entorno

```env
VITE_DATA_SOURCE=local  # o 'remote'
```

## Próximos Pasos

1. **Ejecutar scripts SQL en Supabase**: Ejecutar todos los scripts de `docs/supabase/schema-*.sql` en el SQL Editor de Supabase
2. **Migrar componentes gradualmente**: Actualizar componentes para usar `useData()` o `useDataEntities()` en lugar de `localDataClient`
3. **QA por entidad**: Probar cada entidad después de migrar sus componentes
4. **Script de importación**: Crear script para importar datos existentes desde localStorage a Supabase

## Notas

- **Compatibilidad**: `LocalDataProvider` sigue funcionando durante la transición
- **Modo local**: Sigue disponible con `VITE_DATA_SOURCE=local`
- **Modo remoto**: Disponible con `VITE_DATA_SOURCE=remote` (requiere tablas creadas en Supabase)
- **IDs**: Se mantienen como TEXT para compatibilidad con IDs existentes
- **JSONB**: Estructuras complejas (planes.semanas, asignaciones.plan, etc.) se almacenan como JSONB

