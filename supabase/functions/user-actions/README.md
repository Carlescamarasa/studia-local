# Edge Function: user-actions

Esta función permite a administradores y profesores realizar acciones sobre usuarios (enviar enlace mágico, recuperar contraseña, reenviar invitación).

## Requisitos

- Usuario autenticado con rol `ADMIN` o `PROF`
- Service Role Key configurada en las variables de entorno de Supabase
- Los profesores solo pueden realizar acciones sobre sus estudiantes asignados

## Acciones Disponibles

### 1. Enviar Enlace Mágico (`magic_link`)

Envía un enlace mágico (OTP) al email del usuario para iniciar sesión sin contraseña.

### 2. Recuperar Contraseña (`reset_password`)

Envía un email de recuperación de contraseña al usuario.

### 3. Reenviar Invitación (`resend_invitation`)

Reenvía el email de invitación al usuario.

## Uso

```javascript
const response = await fetch(`${SUPABASE_URL}/functions/v1/user-actions`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    action: 'magic_link', // 'magic_link' | 'reset_password' | 'resend_invitation'
    userId: 'uuid-del-usuario', // opcional si se proporciona email
    email: 'usuario@example.com', // opcional si se proporciona userId
  }),
});
```

## Despliegue

```bash
supabase functions deploy user-actions
```

## Variables de entorno

Asegúrate de tener configuradas en Supabase Dashboard:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Permisos

- **ADMIN**: Puede realizar acciones sobre cualquier usuario
- **PROF**: Solo puede realizar acciones sobre sus estudiantes asignados (verificado por `profesor_asignado_id`)

