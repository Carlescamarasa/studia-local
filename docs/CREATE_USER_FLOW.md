# Flujo de Creación de Usuarios - Studia

## Resumen

Sistema completo para dar de alta alumnos desde el panel de administración, con dos modos de operación:
1. **Crear directamente**: El admin crea el usuario y se envía email de reset de contraseña
2. **Enviar invitación**: El admin envía invitación y el usuario completa el registro

## Arquitectura

### Componentes Frontend

- **`CreateUserModal`** (`src/pages/auth/components/CreateUserModal.jsx`): Modal para crear usuarios (solo ADMIN)
- **`useCreateUser`** (`src/pages/auth/hooks/useCreateUser.js`): Hook que llama a la Edge Function
- **`SignUpForm`** (`src/pages/auth/components/SignUpForm.jsx`): Formulario reutilizable para registro público (futuro)

### Backend (Edge Function)

- **`create-user`** (`supabase/functions/create-user/index.ts`): Edge Function que usa Admin API para crear usuarios

## Flujo de Usuario

### Modo 1: Crear Usuario Directamente

1. Admin va a `/usuarios`
2. Clic en "Crear usuario"
3. Rellena: email, nombre completo, nivel (opcional), profesor asignado (opcional)
4. Selecciona modo "Directo"
5. Clic en "Crear usuario"
6. Sistema:
   - Crea usuario en `auth.users` con contraseña temporal
   - Confirma email automáticamente
   - Genera link de reset de contraseña
   - Actualiza perfil con nivel y profesor
7. Usuario recibe email con enlace para establecer contraseña
8. Usuario hace clic, establece contraseña y puede iniciar sesión

### Modo 2: Enviar Invitación

1. Admin va a `/usuarios`
2. Clic en "Crear usuario"
3. Rellena: email, nombre completo, nivel (opcional), profesor asignado (opcional)
4. Selecciona modo "Invitación"
5. Clic en "Enviar invitación"
6. Sistema:
   - Crea usuario en `auth.users` sin confirmar email
   - Genera link de invitación
   - Actualiza perfil con nivel y profesor
7. Usuario recibe email con enlace de invitación
8. Usuario hace clic, completa el formulario y establece contraseña

## Campos del Formulario

- **Email** (requerido): Dirección de correo del usuario
- **Nombre completo** (requerido): Nombre completo del usuario
- **Experiencia (Nivel)** (opcional): principiante, intermedio, avanzado, profesional
- **Profesor asignado** (opcional, solo admin): Seleccionar de lista de profesores

## Seguridad

- Solo usuarios con rol `ADMIN` pueden crear usuarios
- La Edge Function verifica el rol antes de proceder
- La `service_role` key nunca se expone en el frontend
- Validación de campos en frontend y backend

## Despliegue

### 1. Desplegar Edge Function

```bash
# Desde la raíz del proyecto
supabase functions deploy create-user
```

### 2. Verificar Variables de Entorno

Las siguientes variables deben estar configuradas automáticamente en Supabase:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Si necesitas configurarlas manualmente:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

### 3. Verificar Configuración de Supabase

En Supabase Dashboard → Authentication → Email Templates:
- Verificar que "Invite user" esté habilitado
- Verificar que "Reset password" esté habilitado
- Verificar URLs de redirección en URL Configuration

## Uso Futuro: Registro Público

Cuando se habilite el registro público:

1. Cambiar `signUp: false` a `signUp: true` en `authConfig.js`
2. Añadir ruta `/signup` en `Router.jsx`
3. Usar `SignUpForm` en la página de registro
4. El formulario será el mismo pero sin campo de profesor asignado

## Troubleshooting

### Error: "No tienes permisos para crear usuarios"
- Verificar que el usuario autenticado tenga rol `ADMIN` en la tabla `profiles`

### Error: "Service role key no configurada"
- Verificar que `SUPABASE_SERVICE_ROLE_KEY` esté configurada en Supabase Dashboard → Edge Functions → Secrets

### El usuario no recibe el email
- Verificar configuración de SMTP en Supabase
- Verificar que los templates de email estén habilitados
- Revisar logs de la Edge Function en Supabase Dashboard

### El perfil no se actualiza con nivel/profesor
- Verificar que el trigger `on_auth_user_created` esté funcionando
- Verificar políticas RLS en la tabla `profiles`
- Revisar logs de la Edge Function

