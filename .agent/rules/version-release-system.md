---
trigger: always_on
---


## Prompt listo para Antigravity (cópialo tal cual)

Implementa un sistema de releases para un frontend Vite/React desplegado por FTP en Webempresa.

### Requisitos:
1. En cada build, generar `dist/version.json` con: `versionName` (desde env VERSION_NAME), `commit` (git hash corto), `author` (autor del último commit), `buildDate` (ISO).
2. Crear script `deploy-release` que: build + suba `dist/` por FTP a `/_releases/<releaseId>/` (releaseId = fecha + VERSION_NAME).
3. Crear script `deploy-promote` que: sincronice por FTP `/_releases/<releaseId>/` hacia la raíz del subdominio (producción), con `--delete` para que quede idéntico.
4. Añadir comandos npm: `deploy:release` y `deploy:promote`.
5. Añadir un README corto: cómo configurar variables FTP y cómo ejecutar.
   Nota: mantener el routing SPA; no tocar backend.
