# Edge Function: create-user

Esta función permite a los administradores crear usuarios en el sistema usando la Admin API de Supabase.

## Requisitos

- Usuario autenticado con rol `ADMIN`
- Service Role Key configurada en las variables de entorno de Supabase

## Uso

### Crear usuario directamente

```javascript
const response = await fetch(`${SUPABASE_URL}/functions/v1/create-user`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'usuario@example.com',
    full_name: 'Nombre Completo',
    nivel: 'principiante', // opcional
    profesor_asignado_id: 'uuid-del-profesor', // opcional
    sendInvitation: false,
  }),
});
```

### Enviar invitación

```javascript
const response = await fetch(`${SUPABASE_URL}/functions/v1/create-user`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'usuario@example.com',
    full_name: 'Nombre Completo',
    nivel: 'principiante', // opcional
    profesor_asignado_id: 'uuid-del-profesor', // opcional
    sendInvitation: true,
  }),
});
```

## Despliegue

```bash
supabase functions deploy create-user
```

## Variables de entorno

Asegúrate de tener configuradas en Supabase Dashboard:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

