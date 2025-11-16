# Base44 App


This app was created automatically by Base44.
It's a Vite+React app that communicates with the Base44 API.

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