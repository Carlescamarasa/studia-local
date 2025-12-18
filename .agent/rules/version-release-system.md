---
trigger: always_on
---

Este sistema ya está implementado y funcionando. Mantén y extiende lo existente. 
NO modifiques .htaccess, NO cambies rutas remotas, NO renombres carpetas, y NO reescribas deploy/release.sh o deploy/activate.sh salvo para logs o pequeños flags de fiabilidad.

Rutas remotas (fijas):
- /_releases/<releaseId>/ (histórico)
- /_current/ (producción)
- /version.json debe mapear a /_current/version.json vía .htaccess

Extensión (changelog) — NO quiero editar JSON a mano:
- El changelog debe generarse automáticamente a partir de Git (commits desde el último release/tag o desde el último deploy).
- Debe sincronizarse a Supabase para que se vea en Admin → Configuración → Versión.
- Yo solo superviso y, si hace falta, edito el texto final desde la web (Admin), pero no quiero tocar Supabase manualmente.

Requisitos:
1) En cada build, generar dist/version.json con: versionName (env VERSION_NAME), commit (git short hash), author (autor último commit), buildDate (ISO).
2) deploy/release.sh: build + subir dist/ a /_releases/<releaseId>/ (releaseId = fecha + VERSION_NAME).
3) deploy/activate.sh: sincronizar dist/ a /_current/ (modo seguro por FTP; evitar dejar _current a medias).
4) Mantener comandos npm: build-version y opcionalmente deploy:release, deploy:activate.
5) Al decir “DEPLOY vX”, ejecutar:
   VERSION_NAME="vX" ./deploy/release.sh && ./deploy/activate.sh
   Luego abrir:
   https://studia.latrompetasonara.com/version.json?ts=NOW
   y pegar el JSON resultante.
