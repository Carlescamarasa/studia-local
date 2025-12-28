# Módulo Estudio

Componentes y lógica para el modo de estudio/práctica musical de Studia.

## Estructura

```
features/estudio/
├── components/          # Componentes UI del modo estudio
│   ├── CronometroCompacto.tsx    # Cronómetro con indicador de tiempo
│   ├── ItinerarioMini.tsx        # Navegación visual de ejercicios
│   ├── MenuToggleButton.tsx      # Botón toggle del menú lateral
│   ├── ModalCancelar.tsx         # Modal de confirmación al salir
│   ├── ModalFinalizarSesion.tsx  # Modal para finalizar sesión
│   ├── ResumenFinal.tsx          # Diálogo de resumen y feedback
│   └── TimelineProgreso.tsx      # Timeline de progreso
├── hooks/               # Hooks específicos del módulo
│   ├── useRegistrosBloque.ts     # Gestión de registros por bloque
│   └── useRegistrosSesion.ts     # Gestión de registros de sesión
├── services/            # Servicios de datos (vacío actualmente)
└── utils/               # Utilidades (vacío actualmente)
```

## Uso

El módulo se consume principalmente desde `/pages/studia.jsx`, que renderiza la interfaz completa del modo de estudio.

```tsx
import ResumenFinal from '@/features/estudio/components/ResumenFinal';
import ModalCancelar from '@/features/estudio/components/ModalCancelar';
import { useRegistrosSesion } from '@/features/estudio/hooks/useRegistrosSesion';
```

## Componentes Principales

### ResumenFinal
Diálogo modal que aparece al completar una sesión. Permite:
- Valorar la dificultad de la práctica (1-4)
- Añadir notas
- Subir vídeo a YouTube
- Adjuntar enlaces multimedia

### ModalCancelar
Modal de confirmación para salir de la práctica con opciones:
- Guardar estado y salir
- Salir sin guardar
- Continuar practicando

### CronometroCompacto
Muestra tiempo actual vs objetivo con indicadores visuales de progreso.
