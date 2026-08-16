# Continuidad del proyecto Savia

> Documento de traspaso para continuar el trabajo con otro modelo sin perder decisiones ni repetir tareas. Actualizado: 2026-08-15, America/Santiago.

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

## 3. Estado confirmado

### Backend completo

Ya están implementados:

- migración SQLite versionada e índices;
- seed reproducible con un administrador, dos usuarios, cultivos, ocho sensores y 30 días de lecturas horarias;
- health, registro, login, logout y `me`;
- consulta/edición del invernadero propio;
- CRUD de cultivos y filtros backend;
- CRUD de sensores;
- creación/consulta de lecturas y período;
- resumen personal;
- administración de usuarios, recursos, estadísticas y borrado en cascada;
- validación, errores normalizados, Helmet, rate limit, control de origen y cookies seguras;
- publicación opcional de `apps/web/dist` desde Express.

Verificaciones realizadas desde la raíz:

```bash
npm run build --workspace apps/api
npm test --workspace apps/api
```

Resultado confirmado: build exitoso y **6/6 pruebas de integración aprobadas**. Las pruebas cubren sesión revocable, registro + único invernadero, CRUD/filtro backend, aislamiento horizontal, período/resumen y administración/cascadas.

### Frontend en implementación

Existen las páginas y componentes principales en `apps/web/src`, pero al escribir este traspaso todavía falta cerrar estilos, compilar y hacer QA visual. No asumir que el frontend está verificado hasta ejecutar los pasos de la sección 5.

### Documentación completa

- `docs/arquitectura.md`
- `docs/modelo-datos.md`
- `docs/rubrica.md`
- `docs/despliegue.md`

La documentación usa Mermaid, describe sesiones, aislamiento, cascadas, PWA y despliegue con volumen.

### Dependencias

Se ejecutó `npm install` desde la raíz: 592 paquetes instalados y 0 vulnerabilidades en esa ejecución. Como algunos `package.json` cambiaron después, ejecutar nuevamente `npm install` antes del check final para sincronizar `package-lock.json`.

## 4. Contrato que no debe romperse

- Estados de cultivo backend: `PLANNED | ACTIVE | HARVESTED | CANCELLED`.
- Tipos de sensor backend: `TEMPERATURE | AIR_HUMIDITY | SOIL_MOISTURE | LIGHT`.
- La unidad del sensor la deriva el backend; el frontend no debe enviarla al crear.
- `plantedAt` es obligatorio al crear un cultivo.
- Respuestas API exitosas: `{ "data": ... }`; paginación en `meta`.
- Errores: `{ "error": { "code", "message", "fields?", "requestId" } }`.
- Variable frontend: `VITE_API_BASE_URL`, con valor predeterminado `/api/v1`.
- Script raíz `db:init` debe delegar en `apps/api` a `db:migrate`.
- Desarrollo local: web `5173`, API `3000`, proxy de Vite para `/api`.

## 5. Plan ordenado para continuar

1. Esperar/recoger el trabajo frontend concurrente y revisar `apps/web/src/styles.css`.
2. Ejecutar `npm install` en la raíz para actualizar el lockfile.
3. Ejecutar `npm run typecheck`; reparar todos los errores de contrato entre web y API.
4. Añadir un script de prueba/lint web o ajustar los scripts raíz para que `npm run check` sea real y no invoque scripts inexistentes.
5. Ejecutar migración y seed en una base local limpia:

   ```bash
   cp .env.example .env
   npm run db:init
   npm run db:seed
   ```

6. Levantar `npm run dev` y comprobar login con:

   - administrador: `admin@invernadero.local` / `Admin123!`
   - usuario: `camila@invernadero.local` / `Usuario123!`
   - segundo usuario: `diego@invernadero.local` / `Usuario123!`

7. Recorrer manualmente: login, dashboard, CRUD/filtro de cultivos, CRUD de sensores, historial/gráfico, cuenta, admin y logout.
8. Crear/ajustar Dockerfile raíz que compile ambos workspaces y ejecute Express con `WEB_DIST_PATH=/app/apps/web/dist` y `DATABASE_PATH=/data/greenhouse.sqlite`.
9. Reescribir el README raíz con instalación, variables, credenciales demo, arquitectura, scripts, uso y despliegue.
10. Ejecutar la validación final:

    ```bash
    npm run typecheck
    npm test
    npm run build
    npm audit
    ```

11. Ejecutar QA de navegador en 1440, 390 y 320 px: overflow, consola, teclado, foco, modales, rutas profundas, actualización PWA, tabla accesible del gráfico y `prefers-reduced-motion`.
12. Validar producción local con `npm start`: Express debe servir la SPA compilada y `/api/v1/health`.
13. No afirmar que está desplegado hasta contar con una URL pública y comprobar persistencia después de reiniciar el servicio.

## 6. Pendientes/riesgos conocidos

- El Docker local está instalado pero su daemon no está activo; no depender de Docker para la demo local.
- `apps/api/Dockerfile` construye solo la API. Para origen único se necesita el Dockerfile raíz indicado arriba.
- Verificar que `package-lock.json` incluya `dotenv`, añadido al backend después de la primera instalación raíz.
- Los iconos PNG PWA de 192 y 512 px ya fueron generados en `apps/web/public/icons`; confirmar que el manifest los encuentre en build.
- No cachear respuestas `/api` en Workbox.
- Confirmar que el formulario de sensores no envíe `unit` y que el frontend no exponga estados/tipos que el backend rechaza.
- Confirmar que el historial use fechas ISO con zona horaria y que `from <= to`.
- La entrega aún no tiene URL pública ni credenciales de hosting; despliegue real requerirá autorización/acceso del usuario.

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
