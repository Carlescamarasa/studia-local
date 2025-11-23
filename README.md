# Studia

Aplicación web para el estudio musical estructurado. Permite a alumnos practicar con sesiones guiadas, a profesores gestionar asignaciones y planes de estudio, y a administradores gestionar usuarios y contenido.

## Stack Técnico

- **Frontend**: React 18 + Vite 6
- **UI**: Tailwind CSS + Radix UI + Lucide Icons
- **Estado**: TanStack Query (React Query)
- **Backend**: Supabase (Auth + Database)
- **Persistencia**: localStorage (modo local) / Supabase (modo remoto)
- **Diseño**: Sistema de diseño runtime con DesignProvider

## Requisitos

- Node.js 18+ y npm
- (Opcional) Cuenta de Supabase si usas modo remoto

## Inicio Rápido

### Instalación

```bash
npm install
```

### Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

### Build para Producción

```bash
npm run build
```

Los archivos optimizados se generan en `dist/`.

### Preview del Build

```bash
npm run preview
```

### Linting

```bash
npm run lint
```

## Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Supabase (requerido para modo remoto)
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key

# Fuente de datos (local | remote)
VITE_DATA_SOURCE=local
```

**Nota**: No incluyas secretos reales en el repositorio. Usa `.env.local` para desarrollo local.

## Entornos

### Modo Local (`VITE_DATA_SOURCE=local`)

- Todos los datos se almacenan en `localStorage` bajo la clave `studia_data`
- No requiere conexión a servidor
- Ideal para desarrollo y pruebas

### Modo Remoto (`VITE_DATA_SOURCE=remote`)

- Los datos se almacenan en Supabase
- Requiere autenticación
- Ideal para producción

## Datos de Prueba

La aplicación incluye una página de datos de prueba en `/testseed` que permite:

- Generar datos semilla (piezas, planes, asignaciones)
- Verificar integridad de datos
- Resetear datos de prueba

## Sistema de Diseño

La aplicación incluye un sistema de diseño runtime basado en tokens CSS:

- **Panel de diseño**: Accede a `/design` para personalizar colores, tipografía y espaciado en tiempo real
- **Tema claro/oscuro**: Disponible desde el sidebar
- **Documentación técnica**: Ver `docs/ARQUITECTURA.md` para más detalles

## Estructura del Proyecto

```
src/
├── pages/          # Páginas principales (hoy, semana, asignaciones, etc.)
├── components/     # Componentes reutilizables
├── hooks/          # Custom hooks
├── utils/          # Utilidades (hotkeys, log, etc.)
├── api/            # Clientes de datos (local/remote)
├── data/           # Capa de datos local
├── design/         # Sistema de diseño (tokens, estilos)
└── auth/           # Autenticación y gestión de usuarios
```

## Documentación

### Manuales de Usuario

- **[Manual Alumno](docs/USUARIO-ALUMNO.md)** - Guía completa para estudiantes
- **[Manual Profesor](docs/USUARIO-PROFESOR.md)** - Guía completa para profesores
- **[Manual Admin](docs/USUARIO-ADMIN.md)** - Guía completa para administradores

### Documentación Técnica

- **[Atajos de Teclado](docs/HOTKEYS.md)** - Referencia completa de hotkeys
- **[Arquitectura](docs/ARQUITECTURA.md)** - Documentación técnica del proyecto

## Soporte

Para reportar problemas o solicitar ayuda:

1. **Estudiantes**: Usa el "Centro de dudas" desde el menú lateral
2. **Desarrolladores**: Revisa `docs/ARQUITECTURA.md` o los comentarios en el código
