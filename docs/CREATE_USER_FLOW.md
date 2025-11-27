# LEGACY - Ver USUARIO-ADMIN.md

Este documento ha sido parcialmente fusionado en la documentación de usuario.

**Ver en su lugar**:
- [docs/USUARIO-ADMIN.md](USUARIO-ADMIN.md) - Sección "Gestión de Usuarios" → "Crear Usuario"

El contenido original sobre el flujo de creación de usuarios se encuentra ahora en `docs/USUARIO-ADMIN.md` bajo la sección de Gestión de Usuarios.

## Notas Técnicas (para developers)

Si necesitas información técnica sobre la implementación del flujo de creación de usuarios:

- **Frontend**: `src/pages/auth/components/CreateUserModal.jsx`
- **Hook**: `src/pages/auth/hooks/useCreateUser.js`
- **Backend**: `supabase/functions/create-user/index.ts`
- **Documentación técnica**: Ver `docs/ARQUITECTURA.md` → Sección "Seguridad" → "Flujo de Creación de Usuarios"
