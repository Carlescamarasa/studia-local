# Feature: Cuaderno

Gestión completa de procesos didácticos individuales, seguimiento de estudiantes y asignaciones.

## 📁 Estructura

```
features/cuaderno/
├── pages/
│   ├── CuadernoPage.tsx         # Página principal
│   └── index.ts
├── components/
│   ├── CuadernoContent.tsx      # Contenido principal con tabs
│   ├── CuadernoHeader.tsx       # Header con navegación semanal y botón "Nueva Asignación"
│   ├── CuadernoTabs.tsx         # Toggle Estudiantes/Asignaciones
│   ├── CuadernoEstudiantesTab.tsx
│   ├── CuadernoAsignacionesTab.tsx
│   ├── EstudianteCard.tsx       # Card de estudiante con sesiones y feedback
│   ├── AsignacionesTab.jsx      # Tabla de asignaciones (migrado)
│   └── index.ts
├── hooks/
│   └── index.ts                 # Preparado para futuros hooks
├── utils/
│   ├── dateHelpers.ts           # Helpers de fecha
│   ├── constants.ts             # focoLabels, focoColors
│   └── index.ts
├── README.md
└── index.ts
```

## 🎯 Responsabilidades

- **Vista Estudiantes:** Lista de estudiantes con filtros (mis alumnos/todos, con/sin asignación)
- **Vista Asignaciones:** Tabla completa de asignaciones con acciones bulk
- **Feedback Semanal:** Creación/edición de feedback por estudiante
- **Sesiones:** Visualización expandible del contenido de sesiones
- **Nueva Asignación:** Botón de acceso rápido al wizard de creación

## 🔌 Dependencias Externas

### Hooks Globales
- `@/hooks/entities/useUsers`
- `@/hooks/entities/useAsignaciones`
- `@/hooks/entities/useFeedbacksSemanal`

### Componentes Compartidos
- `@/shared/components/study/SessionContentView`
- `@/shared/components/feedback/ModalFeedbackSemanal`
- `@/shared/components/media/MediaLinksBadges`
- `@/shared/components/media/MediaPreviewModal`

## 📊 Roles

- **PROF:** Ve solo sus alumnos asignados por defecto
- **ADMIN:** Ve todos los estudiantes, puede filtrar

## 🚀 Próximas Extensiones

- [ ] Timeline de actividad por estudiante
- [ ] Feedback multimedia (videos, imágenes)
- [ ] Historial de asignaciones completadas
- [ ] Métricas de progreso integradas

## 📝 Notas

Componentes candidatos para mover a `/shared/` en futuro sprint:
- `EstudianteCard` si se usa en otros features
- `AsignacionesTab` si se necesita en contextos adicionales
