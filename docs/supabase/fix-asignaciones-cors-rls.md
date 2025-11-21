# Solución para Errores CORS y RLS en Creación de Asignaciones

## Problemas Identificados

1. **Error CORS**: La solicitud a Supabase está siendo bloqueada por CORS
2. **Error RLS**: La política de seguridad a nivel de fila está bloqueando la inserción

## Análisis del Código

### 1. Error CORS

**Causa probable:**
- El cliente de Supabase está configurado correctamente, pero puede haber un problema con:
  - El token de autenticación no se está enviando en las peticiones
  - La configuración de CORS en Supabase Dashboard no incluye el origen correcto
  - El token de sesión ha expirado

**Solución:**

#### A. Verificar configuración CORS en Supabase Dashboard

1. Ve a **Supabase Dashboard** → Tu proyecto → **Settings** → **API**
2. En la sección **CORS**, asegúrate de que tu URL de desarrollo esté en la lista de orígenes permitidos:
   - `http://localhost:5173` (o el puerto que uses)
   - `http://localhost:3000` (si usas otro puerto)
   - Cualquier URL de producción que uses

3. Guarda los cambios

#### B. Verificar que el usuario esté autenticado

El cliente de Supabase necesita una sesión activa. Verifica que:

```javascript
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  // El usuario no está autenticado
}
```

### 2. Error RLS

**Causa probable:**
- La política RLS requiere que `profesor_id = auth.uid()::text`
- El `effectiveUser?.id` puede no coincidir con `auth.uid()` si:
  - El usuario no está autenticado correctamente
  - El `effectiveUser.id` no es el UUID de Supabase Auth
  - Hay un problema con la conversión de tipos (UUID vs TEXT)

**Solución:**

#### A. Verificar que `profesorId` coincida con `auth.uid()`

La política RLS actual requiere que el `profesor_id` sea exactamente igual al `auth.uid()` del usuario autenticado. Verifica en el código que se está usando el ID correcto:

```typescript
// En FormularioRapido.jsx línea 111
profesorId: effectiveUser?.id, // Este debe ser el UUID de Supabase Auth
```

**IMPORTANTE**: En modo Supabase, `effectiveUser.id` DEBE ser el UUID de `auth.users`, que coincide con `profiles.id` y `auth.uid()`.

#### B. Usar `auth.uid()` directamente desde Supabase

Si hay dudas sobre el ID, es mejor obtenerlo directamente del token JWT:

```typescript
import { supabase } from '@/lib/supabaseClient';

// Obtener el usuario autenticado directamente
const { data: { user } } = await supabase.auth.getUser();
const profesorId = user?.id; // Este es el auth.uid()
```

## Solución Propuesta

### 1. Actualizar `FormularioRapido.jsx` para usar `auth.uid()` directamente

Modificar el código para obtener el ID del usuario autenticado directamente de Supabase Auth, en lugar de depender solo de `effectiveUser`:

```jsx
import { supabase } from '@/lib/supabaseClient';

// En el componente, obtener el ID directamente
const { data: { user: authUser } } = await supabase.auth.getUser();
const profesorId = authUser?.id || effectiveUser?.id;
```

### 2. Agregar logging para depuración

Agregar logs para verificar qué ID se está usando:

```typescript
console.log('[DEBUG] Creando asignación:', {
  effectiveUserId: effectiveUser?.id,
  authUid: authUser?.id,
  match: effectiveUser?.id === authUser?.id,
  profesorId: profesorId,
});
```

### 3. Verificar que el token esté siendo enviado

Asegurarse de que el cliente de Supabase está enviando el token en cada petición. El cliente de Supabase debería hacerlo automáticamente si el usuario está autenticado, pero puedes verificar:

```typescript
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  throw new Error('Usuario no autenticado');
}
```

## Verificación de la Política RLS

La política actual en `schema-asignaciones.sql` es:

```sql
CREATE POLICY "Teachers and admins can create asignaciones"
  ON asignaciones
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('PROF', 'ADMIN')
    )
    AND profesor_id = auth.uid()::text
  );
```

Esta política requiere:
1. Que el usuario autenticado (`auth.uid()`) exista en `profiles` y tenga rol `PROF` o `ADMIN`
2. Que el `profesor_id` de la asignación sea exactamente igual a `auth.uid()::text`

**IMPORTANTE**: Si eres ADMIN y quieres crear asignaciones para otros profesores, necesitas aplicar el script `fix-rls-policies-admin.sql` que ya existe en `docs/supabase/fix-rls-policies-admin.sql`.

## Pasos Inmediatos

1. **Verificar autenticación**: Asegúrate de que el usuario esté autenticado antes de crear la asignación
2. **Verificar CORS**: Revisa la configuración en Supabase Dashboard
3. **Verificar RLS**: Asegúrate de que `profesorId` coincida con `auth.uid()`
4. **Agregar logging**: Agrega logs para depurar qué está pasando

## Consultas SQL para Verificar

Para verificar el estado actual, ejecuta estas consultas en Supabase SQL Editor:

```sql
-- Verificar políticas actuales
SELECT * FROM pg_policies WHERE tablename = 'asignaciones';

-- Verificar que el usuario autenticado existe en profiles
SELECT id, email, role 
FROM profiles 
WHERE id = auth.uid();

-- Verificar asignaciones existentes (solo las que puedes ver)
SELECT id, profesor_id, alumno_id, estado 
FROM asignaciones 
LIMIT 10;
```


