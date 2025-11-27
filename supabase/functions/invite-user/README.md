# Edge Function: invite-user

Esta función envía una invitación por email a un usuario para que complete su registro y rellene el formulario. No crea el usuario; el usuario se creará cuando complete el formulario de registro.

## Requisitos

- Usuario autenticado con rol `ADMIN`
- Service Role Key configurada en las variables de entorno de Supabase

## Uso

```javascript
const response = await fetch(`${SUPABASE_URL}/functions/v1/invite-user`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'usuario@example.com',
    alias: 'Nombre del usuario', // Opcional, solo para el email de bienvenida
  }),
});
```

## Despliegue

```bash
supabase functions deploy invite-user
```

## Variables de entorno

Asegúrate de tener configuradas en Supabase Dashboard:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Notas

- El alias no se guarda en el sistema, solo se usa en el email de bienvenida
- Si el usuario ya existe, la función retornará un error
- El email enviado será un magic link que redirige a `/sign-up` con el email pre-rellenado

