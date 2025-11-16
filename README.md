# Base44 App


This app was created automatically by Base44.
It's a Vite+React app that communicates with the Base44 API.

## Design System (Studia)

Esta app integra un sistema de diseño runtime basado en tokens y variables CSS:

- Documentación completa: `src/design/README.md`
- Temas disponibles: Light y Dark (seleccionables en la página “Panel de Diseño”)
- Tokens → CSS vars → clases semánticas:
  - Tokens: `src/design/designSystem.ts`
  - CSS vars: generadas por `DesignProvider` desde `src/components/design/designConfig.ts`
  - Clases globales: `src/index.css` (`.btn-*`, `.ctrl-field`, `.app-card/.app-panel`)
  - Mapa de estilos: `src/design/componentStyles.ts`

Pautas clave:
- Usar `Button` (ui) y variantes `.btn-*` para botones.
- Usar `ctrl-field` (vía `Input`, `SelectTrigger`) para inputs y selects.
- Preferir `Card` con `app-card`/`panelBase` según el caso.
- Textos secundarios en fondos claros → `text-ui/80` (evitar `text-muted` para contenido primario).

Página de control: `/design` (solo ADMIN)
- Presets integrados (Light/Dark) y presets personalizados (import/export).
- Cambios persistidos en `localStorage` y aplicados como CSS vars en tiempo real.

## Running the app

```bash
npm install
npm run dev
```

## Building the app

```bash
npm run build
```

For more information and support, please contact Base44 support at app@base44.com.

## Capa de datos local (studia_data)

La app utiliza una capa de datos local desacoplada que persiste en `localStorage` bajo la clave `studia_data`, con clientes CRUD por entidad listos para migrar a una API remota.

Consulta la documentación técnica aquí:

- `src/data/README.md`