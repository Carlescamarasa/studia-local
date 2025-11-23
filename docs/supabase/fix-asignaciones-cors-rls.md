# LEGACY - Solución Técnica Específica

Este documento describe una solución específica para problemas de CORS y RLS en la creación de asignaciones. **Solo útil si el bug aún no está resuelto**.

**Si el bug está resuelto**: Este documento puede eliminarse.

**Si aún encuentras problemas de CORS/RLS**:
1. Verifica que el usuario esté autenticado correctamente
2. Verifica que `profesorId` coincida con `auth.uid()`
3. Consulta `docs/supabase/README.md` para ver políticas RLS actuales
4. Revisa los logs de Supabase para ver errores específicos

Para documentación general sobre Supabase y RLS, consulta:
- [docs/ARQUITECTURA.md](../ARQUITECTURA.md) - Sección "Base de Datos Supabase" y "Seguridad"

---

## Contenido Original (para referencia)

[... resto del contenido original preservado abajo ...]
