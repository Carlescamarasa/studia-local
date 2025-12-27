# Sistema de Impersonación (Impersonation)

## Objetivo de la funcionalidad

El sistema de impersonación permite a los usuarios con rol `ADMIN` navegar y operar dentro de la aplicación **como si fueran otro usuario** (estudiante o profesor), sin necesidad de conocer sus credenciales. 

Esto facilita:
- **Testing y QA**: Los administradores pueden reproducir problemas específicos del usuario.
- **Soporte técnico**: Visualizar exactamente lo que ve un usuario sin comprometer su privacidad.
- **Auditoría**: Verificar permisos y comportamientos específicos de roles.

## Cómo se implementa

### 1. Contexto `EffectiveUserProvider`

El sistema se basa en un contexto React que gestiona dos conceptos de usuario:

- **`realUser`**: El usuario autenticado (Admin que inició sesión).
- **`effectiveUser`**: El usuario "efectivo" bajo el cual se está operando (puede ser el Admin mismo o el usuario impersonado).

```javascript
// src/contexts/EffectiveUserProvider.jsx
export function EffectiveUserProvider({ children }) {
  const { user: realUser } = useAuth();
  const [impersonatedUserId, setImpersonatedUserId] = useState(null);
  
  // effectiveUser = impersonatedUser || realUser
  const effectiveUser = useMemo(() => {
    return impersonatedUserId ? impersonatedUser : realUser;
  }, [impersonatedUserId, impersonatedUser, realUser]);
  
  // ...
}
```

### 2. Persistencia en `localStorage`

El ID del usuario impersonado se guarda en `localStorage` bajo la clave `impersonatedUserId`:

```javascript
const startImpersonation = useCallback(async (targetUserId) => {
  setImpersonatedUserId(targetUserId);
  localStorage.setItem('impersonatedUserId', targetUserId);
}, []);

const stopImpersonation = useCallback(() => {
  setImpersonatedUserId(null);
  localStorage.removeItem('impersonatedUserId');
  queryClient.invalidateQueries(); // Refrescar datos
}, [queryClient]);
```

**Ventaja**: La impersonación persiste entre recargas de página.  
**Desventaja**: Debe limpiarse manualmente (logout, botón de detener impersonación).

### 3. Inyección en Supabase con `auth.uid()`

Las queries de Supabase usan la función `auth.uid()` en las políticas RLS (Row Level Security). **Importante**: `auth.uid()` siempre devuelve el ID del usuario **autenticado** (el Admin), **no** el del usuario impersonado.

```sql
-- Ejemplo de política RLS
CREATE POLICY "Users can read their own data"
ON public.usuarios
FOR SELECT
USING (auth.uid() = id);
```

**Consecuencia**: Las políticas RLS **no respetan la impersonación automáticamente**.

### 4. Filtrado manual en el frontend

Para que la impersonación funcione correctamente, el frontend debe **filtrar manualmente** los datos usando `effectiveUserId`:

```javascript
// ❌ INCORRECTO: usa auth.uid() que es siempre el Admin
const { data } = useQuery({
  queryKey: ['registros'],
  queryFn: () => supabase.from('registros').select('*')
});

// ✅ CORRECTO: filtra por effectiveUserId
const { effectiveUserId } = useEffectiveUser();
const { data } = useQuery({
  queryKey: ['registros', effectiveUserId],
  queryFn: () => supabase
    .from('registros')
    .select('*')
    .eq('usuario_id', effectiveUserId)
});
```

## Limitaciones

### RLS usa siempre el `realUser`

- **Políticas RLS en Supabase no detectan la impersonación**: `auth.uid()` devuelve siempre el ID del Admin autenticado.
- **El frontend debe filtrar explícitamente**: Todas las queries deben incluir `.eq('usuario_id', effectiveUserId)` o similar.
- **Inserts/Updates requieren especificar el `usuario_id`**: No se auto-completa con `auth.uid()` del usuario impersonado.

### Ejemplo de problema común

```javascript
// ❌ PROBLEMA: esto guarda el registro con usuario_id = Admin
await supabase.from('registros').insert({
  contenido: 'Test',
  // usuario_id no especificado, la BD usa auth.uid() por defecto
});

// ✅ SOLUCIÓN: especificar explícitamente el effectiveUserId
const { effectiveUserId } = useEffectiveUser();
await supabase.from('registros').insert({
  contenido: 'Test',
  usuario_id: effectiveUserId, // Usuario impersonado
});
```

### Seguridad

- **Solo ADMIN puede impersonar**: La UI y las validaciones deben asegurar esto.
- **No hay logs automáticos de impersonación**: Considera implementar auditoría si es crítico.
- **La impersonación persiste en localStorage**: Si el Admin cierra la pestaña sin detener la impersonación, la sesión impersonada continuará en la próxima carga.

## Recomendaciones de uso en frontend

### 1. Siempre usar `useEffectiveUser()` en vez de `useAuth()` o `getCachedAuthUser()`

```javascript
// ❌ INCORRECTO: no respeta impersonación
import { useAuth } from '@/contexts/AuthProvider';
const { user } = useAuth();

// ❌ INCORRECTO: datos cacheados sin impersonación
import { getCachedAuthUser } from '@/utils/authCache';
const user = getCachedAuthUser();

// ✅ CORRECTO: respeta impersonación
import { useEffectiveUser } from '@/contexts/EffectiveUserProvider';
const { effectiveUser, effectiveUserId, isImpersonating } = useEffectiveUser();
```

### 2. En writes, usar `effectiveUserId` explícitamente

Siempre incluir el `usuario_id` del usuario efectivo en inserts y updates:

```javascript
const { effectiveUserId } = useEffectiveUser();

// INSERT
await supabase.from('feedback_semanal').insert({
  semana: '2025-W01',
  contenido: 'Progreso excelente',
  usuario_id: effectiveUserId, // ⚠️ CRÍTICO
});

// UPDATE (si se permite)
await supabase
  .from('perfil')
  .update({ bio: 'Nueva bio' })
  .eq('id', effectiveUserId); // ⚠️ CRÍTICO
```

### 3. En queries, filtrar por `effectiveUserId`

```javascript
const { effectiveUserId } = useEffectiveUser();

const { data: registros } = useQuery({
  queryKey: ['registros-sesion', effectiveUserId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('registros_sesion')
      .select('*')
      .eq('usuario_id', effectiveUserId) // ⚠️ Filtrado explícito
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },
});
```

### 4. Limpiar impersonación al hacer logout

Es fundamental que el logout del Admin también limpie la impersonación:

```javascript
// src/contexts/AuthProvider.jsx o similar
const logout = async () => {
  // 1. Detener impersonación si está activa
  if (isImpersonating) {
    stopImpersonation();
  }
  
  // 2. Logout de Supabase
  await supabase.auth.signOut();
  
  // 3. Limpiar caches
  queryClient.clear();
  
  // 4. Redirigir
  navigate('/login');
};
```

**Alternativa**: Llamar a `stopImpersonation()` desde el `EffectiveUserProvider` cuando detecte que `realUser` es `null`:

```javascript
useEffect(() => {
  if (!realUser && impersonatedUserId) {
    // Si el usuario real se desloguea, limpiar impersonación
    setImpersonatedUserId(null);
    localStorage.removeItem('impersonatedUserId');
  }
}, [realUser, impersonatedUserId]);
```

### 5. Mostrar indicador visual de impersonación

La UI debe mostrar claramente cuando se está en modo impersonación:

```jsx
const { isImpersonating, effectiveUser, realUser, stopImpersonation } = useEffectiveUser();

{isImpersonating && (
  <div className="impersonation-banner">
    ⚠️ Impersonando a <strong>{effectiveUser.email}</strong>
    <button onClick={stopImpersonation}>Detener impersonación</button>
  </div>
)}
```

### 6. Validar permisos según `realUser`, no `effectiveUser`

Los permisos de ADMIN (ej., acceso a rutas protegidas) deben validarse contra `realUser`:

```javascript
const { realUser, effectiveUser } = useEffectiveUser();

// ✅ Validación correcta para rutas de admin
const isAdmin = realUser?.role === 'ADMIN';

// ❌ INCORRECTO: si impersona a un ESTU, perdería acceso
const isAdmin = effectiveUser?.role === 'ADMIN';
```

## Ejemplo completo de uso

```jsx
import { useEffectiveUser } from '@/contexts/EffectiveUserProvider';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

function MisRegistros() {
  const { effectiveUserId, effectiveUser, isImpersonating } = useEffectiveUser();
  
  // Query con filtro explícito
  const { data: registros } = useQuery({
    queryKey: ['registros', effectiveUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('registros_sesion')
        .select('*')
        .eq('usuario_id', effectiveUserId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
  });
  
  // Mutation con usuario explícito
  const createRegistro = useMutation({
    mutationFn: async (nuevoRegistro) => {
      const { data, error } = await supabase
        .from('registros_sesion')
        .insert({
          ...nuevoRegistro,
          usuario_id: effectiveUserId, // ⚠️ Explícito
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
  });
  
  return (
    <div>
      {isImpersonating && (
        <div className="alert alert-warning">
          Viendo registros de {effectiveUser.email}
        </div>
      )}
      
      <h2>Mis Registros</h2>
      <ul>
        {registros?.map(r => (
          <li key={r.id}>{r.titulo} - {r.created_at}</li>
        ))}
      </ul>
      
      <button onClick={() => createRegistro.mutate({ titulo: 'Nuevo registro' })}>
        Crear Registro
      </button>
    </div>
  );
}

export default MisRegistros;
```

## Resumen de buenas prácticas

| ✅ Hacer | ❌ Evitar |
|---------|-----------|
| Usar `useEffectiveUser()` para obtener el usuario activo | Usar `useAuth()` o `getCachedAuthUser()` directamente |
| Filtrar queries con `.eq('usuario_id', effectiveUserId)` | Confiar en que RLS filtrará automáticamente |
| Incluir `usuario_id: effectiveUserId` en inserts/updates | Omitir `usuario_id` esperando que se auto-complete |
| Limpiar impersonación en logout | Dejar sesiones impersonadas activas indefinidamente |
| Validar permisos Admin con `realUser.role` | Validar permisos con `effectiveUser.role` |
| Mostrar banner visual cuando `isImpersonating === true` | Impersonar sin indicación visual clara |

---

**Última actualización**: 2025-12-27
