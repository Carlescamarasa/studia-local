# LEGACY - Documentación Temporal de Migración

Este documento rastrea el progreso de la migración de localStorage a Supabase. **Es temporal y solo útil durante la transición**.

**Estado actual**: Las APIs remotas están implementadas para todas las entidades. Los componentes se pueden migrar gradualmente para usar `useData()` en lugar de `localDataClient` directamente.

Para información técnica sobre la arquitectura de datos, consulta:
- [docs/ARQUITECTURA.md](ARQUITECTURA.md) - Sección "Capa de Datos" y "Estado de Migración"

---

## Resumen (Última actualización: 2024-12-19)

### Fases Completadas

- ✅ Fase 1: Diseño de Esquema Supabase - Scripts SQL creados
- ✅ Fase 2: Contrato de Datos - Tipos TypeScript completos
- ✅ Fase 3: AppDataAPI + DataProvider Unificado - Infraestructura lista

### Estado por Entidad

Todas las entidades tienen APIs remotas implementadas. Falta actualizar componentes individuales para usar `useData()` en lugar de `localDataClient`.

**Variables de Entorno**:
```env
VITE_DATA_SOURCE=local  # o 'remote'
```

**Próximos Pasos**:
1. Ejecutar scripts SQL en Supabase (si aún no se han ejecutado)
2. Migrar componentes gradualmente
3. Probar cada entidad después de migrar

---

**Nota**: Este documento se eliminará una vez completada la migración. Para documentación permanente, consulta `docs/ARQUITECTURA.md`.
