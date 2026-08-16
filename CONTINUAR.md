# Continuidad del proyecto Savia

> Documento de traspaso para continuar el trabajo con otro modelo sin perder decisiones ni repetir tareas. Actualizado: 2026-08-15 22:15, America/Santiago.

## 1. Objetivo vigente

Construir **Savia**, un sistema web universitario de gestión de invernadero que cumpla la rúbrica entregada por el usuario:

- autenticación y cierre de sesión;
- un único invernadero por usuario;
- CRUD de cultivos y sensores;
- filtro de cultivos ejecutado en backend;
- registros históricos de sensores y filtro por período;
- gráficos y resumen de actividad;
- aislamiento estricto de datos por usuario;
- administración de usuarios, recursos, estadísticas y borrado en cascada;
- frontend responsivo, PWA, API propia, persistencia, validación, manejo seguro de errores, despliegue y documentación.

No agregar funcionalidades de dominio que desplacen estos requisitos. La prioridad es demostrar bien la rúbrica.

## 2. Decisiones ya tomadas

- Monorepo npm workspaces.
- `apps/web`: React + TypeScript + Vite, React Router, TanStack Query, React Hook Form, Zod, Recharts, Lucide y `vite-plugin-pwa`.
- `apps/api`: Node 22 + TypeScript + Express 5 + `better-sqlite3`, Zod y bcrypt.
- Frontend y API se sirven bajo el mismo origen en producción. La API vive en `/api/v1`.
- SQLite se eligió para que la entrega funcione sin Docker local. En producción debe montarse un volumen persistente.
- Autenticación con token de sesión opaco en cookie `HttpOnly`; la base guarda solo SHA-256 del token. No usar JWT ni `localStorage` para credenciales.
- Toda consulta de recurso de usuario se acota por el `userId` de la sesión. Un ID ajeno responde `404`.
- La API deriva `greenhouseId` desde la sesión y nunca confía en uno enviado por el frontend.
- Nombre y dirección visual: **Savia — Gestión de invernadero**, estética “cabina de cultivo”. La firma visual es una franja climática que representa aire, follaje y suelo con lecturas reales y hora de actualización.
- PWA: caché de app shell y estáticos; nunca cachear `/api` ni datos autenticados.
- Las migraciones se aplican de forma idempotente al abrir la base (`apps/api/src/db/database.ts`), por lo que el contenedor no necesita un paso de migración separado.

## 3. Estado confirmado (verificado en esta sesión)

Todo el plan de la sección 5 del traspaso anterior está ejecutado. Evidencia obtenida el 2026-08-15:

| Verificación | Comando | Resultado |
| --- | --- | --- |
| Dependencias sincronizadas | `npm install` | 597 paquetes, 0 vulnerabilidades, lockfile sin cambios pendientes |
| Tipos web + API | `npm run typecheck` | sin errores |
| Migración y seed en base limpia | `npm run db:init` && `npm run db:seed` | ambas correctas |
| Pruebas | `npm test` | API 6/6 y web 3/3 aprobadas |
| Build | `npm run build` | web (39 entradas precache, sw.js) y API compiladas |
| Cadena completa | `npm run check` | exit 0 |
| Auditoría | `npm audit` y `npm audit --omit=dev --audit-level=high` | 0 vulnerabilidades |
| Producción local | `npm start` en 3000 | `/api/v1/health` 200, SPA 200, rutas profundas 200 |
| Persistencia | crear cultivo → reiniciar proceso → consultar | el cultivo y la sesión sobreviven al reinicio |

### QA de navegador ejecutado

Se automatizó un recorrido con Chromium (Playwright) sobre el build de producción servido por Express, en 1440, 390 y 320 px. Resultado final: **sin problemas**. Cubrió:

- login de `camila`, dashboard, cultivos, formulario de cultivo, sensores, formulario de sensor, detalle de sensor, historial, cuenta;
- ausencia de overflow horizontal en las tres anchuras, incluidas rutas profundas;
- CRUD real de cultivo (crear, validación de campos obligatorios, editar, eliminar con modal) y de sensor;
- filtro de cultivos ejecutado en backend (`q=` y `status=` viajan en la query) con resultado correcto;
- el POST de sensores no envía `unit` y la unidad derivada por el backend (`%`) aparece en la tabla;
- historial con preset de período reflejado en la URL, validación `from <= to`, tabla accesible y resumen textual del gráfico (`#history-chart-description`);
- foco visible con teclado (outline 3px) y cierre del modal con `Escape`;
- `/admin` bloqueado para usuario no administrador y ruta inexistente con página 404;
- administración: estadísticas, listado y detalle de usuario con recursos asociados;
- logout que revoca la sesión (tras cerrar sesión `/app` redirige a `/login`);
- `prefers-reduced-motion`: 0 elementos con animación o transición mayor a 50 ms;
- service worker disponible y **ninguna** respuesta `/api` en Cache Storage.

Capturas del recorrido en `/tmp/savia-qa/shots` (temporal, no versionado). El script de QA vive fuera del repositorio en `/tmp/savia-qa/qa.mjs`; si se quiere conservar, moverlo a `apps/web/e2e` y añadir Playwright como dependencia de desarrollo.

### Correcciones aplicadas en esta sesión

1. `apps/web/src/styles.css`: el panel de filtros del historial provocaba overflow horizontal a 320 px porque los `input[type=date]` imponían su ancho mínimo intrínseco. Se añadieron `min-width: 0`, ancho completo en los inputs, rango de fechas en una sola columna y padding reducido en los presets dentro de `@media (max-width: 520px)`.
2. `apps/web/vite.config.ts`: el manifest PWA declaraba `lang: "en"`. Ahora declara `lang: 'es'` y `dir: 'ltr'`.

### Comportamientos esperados que no son fallos

- `GET /api/v1/auth/me` responde 401 en cada carga sin sesión; es el sondeo de sesión con cookie `HttpOnly` y el navegador lo registra en consola. No se reintenta (la query excluye 401/403).
- El login está limitado a 10 intentos por IP cada 15 minutos (`TOO_MANY_AUTH_ATTEMPTS`). Al repetir QA automatizado hay que reiniciar el proceso de la API o esperar la ventana.
- El historial preselecciona el sensor modificado más recientemente; si ese sensor no tiene lecturas se muestra el estado vacío.

## 4. Contrato que no debe romperse

- Estados de cultivo backend: `PLANNED | ACTIVE | HARVESTED | CANCELLED`.
- Tipos de sensor backend: `TEMPERATURE | AIR_HUMIDITY | SOIL_MOISTURE | LIGHT`.
- La unidad del sensor la deriva el backend; el frontend no debe enviarla al crear.
- `plantedAt` es obligatorio al crear un cultivo.
- Respuestas API exitosas: `{ "data": ... }`; los listados devuelven `data` como arreglo y paginación en `meta` (`page`, `limit`, `total`).
- Errores: `{ "error": { "code", "message", "fields?", "requestId" } }`.
- Variable frontend: `VITE_API_BASE_URL`, con valor predeterminado `/api/v1`.
- Script raíz `db:init` debe delegar en `apps/api` a `db:migrate`.
- Desarrollo local: web `5173`, API `3000`, proxy de Vite para `/api`.

## 5. Trabajo pendiente

1. **Despliegue real.** El `Dockerfile` raíz existe y es multietapa (dependencias → build → dependencias de producción → runtime con `WEB_DIST_PATH=/app/apps/web/dist`, `DATABASE_PATH=/data/greenhouse.sqlite`, usuario `node` y `VOLUME /data`). **No se pudo construir la imagen: el daemon de Docker está inactivo en esta máquina** (`docker info` falla). Queda por verificar, en un entorno con Docker:
   - que `npm ci --omit=dev` instale `better-sqlite3` en `node:22-bookworm-slim` usando binarios precompilados, sin necesidad de `python3`/`make`/`g++`;
   - el arranque del contenedor con volumen persistente y `APP_ORIGIN` del dominio real.
2. **URL pública.** Falta plataforma y credenciales de hosting. No afirmar que está desplegado hasta comprobar la URL HTTPS y la persistencia después de reiniciar el servicio.
3. **Commit.** Los cambios siguen sin confirmar en git (`git status --short` muestra README, `apps/web`, `package-lock.json`, `Dockerfile`, `.github/`, `apps/web/src/styles.css`, `apps/web/src/lib/format.test.ts`). No se hizo commit porque el usuario no lo pidió.
4. **Directorio ajeno.** Existe `invent invernadero/` en la raíz: es otro clon de git anidado, sin relación con el monorepo y sin seguimiento. Decidir con el usuario si se elimina o se mueve; no se tocó.
5. Opcional: mover el QA de navegador al repositorio (`apps/web/e2e` con `@playwright/test`) para que quede como evidencia versionada.

## 6. Riesgos conocidos

- SQLite exige una sola instancia escritora y volumen persistente; no escalar horizontalmente con el mismo archivo.
- `apps/api/Dockerfile` construye solo la API; para origen único usar el `Dockerfile` de la raíz.
- El seed borra y recrea únicamente las tres cuentas académicas; no ejecutarlo sobre producción (`ALLOW_DEMO_SEED` debe quedar en `false` salvo entorno efímero).
- `AUTO_SEED` debe permanecer en `false` fuera de entornos desechables.
- Las credenciales de demostración están documentadas y deben cambiarse antes de publicar.

## 7. Archivos de entrada para el próximo modelo

Leer primero, en este orden:

1. `CONTINUAR.md`
2. `docs/rubrica.md`
3. `apps/api/src/app.ts`
4. `apps/api/tests/api.test.ts`
5. `apps/web/src/App.tsx`
6. `apps/web/src/lib/api.ts`
7. `apps/web/src/types.ts`
8. `docs/despliegue.md`

Después ejecutar `git status --short` y preservar todos los cambios existentes; pertenecen a este trabajo y no deben descartarse.
