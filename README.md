# Studia Local

Aplicación Vite+React que funciona en modo local con persistencia en `localStorage`. La aplicación es completamente independiente y no requiere conexión a servidores externos.

## Running the app

```bash
npm install
npm run dev
```

## Building the app

```bash
npm run build
```

## Design System (Studia)

Esta app integra un sistema de diseño runtime basado en tokens y variables CSS

Documentación de diseño: `src/design/README.md`


## Capa de datos local (studia_data)

La app utiliza una capa de datos local desacoplada que persiste en `localStorage` bajo la clave `studia_data`, con clientes CRUD por entidad listos para migrar a una API remota.

Documentación de la base de datos: `src/data/README.md`