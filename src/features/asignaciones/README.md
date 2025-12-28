# Feature: Asignaciones

Gestión completa del ciclo de vida de asignaciones: creación, edición, adaptación, publicación y seguimiento.

## 📁 Estructura

```
features/asignaciones/
├── pages/
│   ├── AsignacionesPage.jsx       # Lista de asignaciones
│   ├── AsignacionDetallePage.jsx  # Detalle y edición
│   ├── AdaptarAsignacionPage.jsx  # Editor de adaptación
│   └── index.ts
├── components/
│   ├── CrearAsignacionWizard.jsx  # Wizard de creación
│   ├── AsignacionesActivas.jsx    # Vista activas
│   ├── AsignacionesArchivadas.jsx # Vista archivadas
│   ├── FormularioRapido.jsx       # Form rápido
│   ├── StudentSearchBar.jsx       # Buscador sync
│   ├── StudentSearchBarAsync.jsx  # Buscador async
│   └── index.ts
├── hooks/
│   └── index.ts                   # Re-exports useAsignaciones
├── utils/
│   └── index.ts
├── README.md
└── index.ts
```

## 🎯 Responsabilidades

- **Lista:** Filtrado por estado, profesor, estudiante
- **Crear:** Wizard multi-paso con selección de pieza/plan/alumno
- **Detalle:** Vista del plan con acciones (publicar, cerrar, duplicar)
- **Adaptar:** Editor inline del plan asignado para personalización

## 🔌 Dependencias

### Hooks Globales (re-exportados)
- `@/hooks/entities/useAsignaciones`

### API
- `@/api/remote/asignaciones.ts` - CRUD completo con RPC optimizada

### Shared Components
- `@/shared/components/study/SessionContentView`
- `@/components/ds/PageHeader`

## 📊 Estados de Asignación

| Estado | Descripción |
|--------|-------------|
| `borrador` | Creada pero no publicada |
| `publicada` | Visible para el alumno |
| `en_curso` | Alumno ha empezado |
| `cerrada` | Completada/archivada |

## 🚀 Rutas

- `/asignaciones` → Lista
- `/asignacion-detalle?id=X` → Detalle
- `/adaptar-asignacion?id=X` → Adaptación

## 📝 Notas

- `AsignacionesPage` tiene redirects legacy desde `/preparacion`, `/estudiantes`
- Wizard usa `localDataClient` para mutaciones (modo offline-first)
