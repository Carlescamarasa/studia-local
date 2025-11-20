# Instrucciones de Despliegue - Edge Function create-user

## Prerrequisitos

1. Tener instalado Supabase CLI
2. Tener configurado el proyecto de Supabase
3. Tener acceso a las variables de entorno del proyecto

## Pasos para desplegar

### 1. Instalar Supabase CLI (si no lo tienes)

```bash
npm install -g supabase
```

### 2. Iniciar sesión en Supabase CLI

```bash
supabase login
```

### 3. Vincular tu proyecto

```bash
supabase link --project-ref tu-project-ref
```

O si estás en el directorio del proyecto:

```bash
cd /ruta/a/tu/proyecto
supabase link
```

### 4. Desplegar la función

```bash
supabase functions deploy create-user
```

### 5. Configurar variables de entorno (si no están configuradas automáticamente)

Las variables de entorno deberían estar disponibles automáticamente, pero si necesitas configurarlas manualmente:

```bash
supabase secrets set SUPABASE_URL=tu_url
supabase secrets set SUPABASE_ANON_KEY=tu_anon_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

**IMPORTANTE**: La `SUPABASE_SERVICE_ROLE_KEY` es muy sensible. Nunca la expongas en el frontend.

### 6. Verificar el despliegue

Puedes verificar que la función está desplegada en:
- Supabase Dashboard → Edge Functions
- O probar con curl:

```bash
curl -X POST https://tu-project-ref.supabase.co/functions/v1/create-user \
  -H "Authorization: Bearer TU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","full_name":"Test User","sendInvitation":false}'
```

## Estructura de la función

La función está en: `supabase/functions/create-user/index.ts`

## Notas de seguridad

- La función verifica que el usuario que la llama sea ADMIN
- Usa la service_role key solo en el servidor (Edge Function)
- Nunca expongas la service_role key en el frontend

## Troubleshooting

Si la función no funciona:

1. Verifica que las variables de entorno estén configuradas
2. Verifica que el usuario que llama la función sea ADMIN
3. Revisa los logs en Supabase Dashboard → Edge Functions → Logs
4. Verifica que la función esté desplegada correctamente

