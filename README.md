# Savia — Gestión de invernadero

Savia es una aplicación web universitaria para administrar un invernadero, sus cultivos, sensores y registros históricos. Incluye una PWA responsiva, una API propia, persistencia SQLite, autenticación con sesiones revocables y un módulo administrativo.

## Funcionalidades

- Registro, inicio y cierre de sesión.
- Un único invernadero por usuario.
- CRUD completo de cultivos y sensores.
- Búsqueda y filtros de cultivos ejecutados en el backend.
- Registro histórico de mediciones y filtro por período.
- Gráficos con resumen textual y tabla de datos.
- Dashboard personal con cultivos, sensores, lecturas y actividad reciente.
- Aislamiento de recursos por propietario aplicado en cada consulta SQL.
- Administración de usuarios, recursos asociados, estadísticas globales y borrado en cascada.
- PWA instalable con caché de recursos estáticos; la API autenticada nunca se almacena en el service worker.
- Datos de demostración para recorrer todos los criterios de la rúbrica.

## Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | React, TypeScript, Vite y React Router |
| Datos remotos | TanStack Query |
| Formularios | React Hook Form y Zod |
| Gráficos | Recharts |
| PWA | vite-plugin-pwa y Workbox |
| Backend | Node.js 22, TypeScript y Express 5 |
| Persistencia | SQLite con better-sqlite3 y migraciones versionadas |
| Seguridad | Sesiones opacas, bcrypt, Helmet, rate limiting y control de origen |
| Pruebas | Vitest y Supertest |

La aplicación se despliega bajo un único origen: Express publica `/api/v1` y también el build de React. Esto simplifica las cookies seguras y evita una configuración CORS frágil.

## Requisitos

- Node.js `22.12` o superior.
- npm `10` o superior.
- No se necesita Docker ni un servidor de base de datos para desarrollo local.

## Inicio rápido

```bash
git clone https://github.com/victorbarrera1/Proyecto-dwm-eit.git
cd Proyecto-dwm-eit
cp .env.example .env
npm install
npm run db:init
npm run db:seed
npm run dev
```

Abrir [http://localhost:5173](http://localhost:5173). Vite envía `/api` a Express en `http://localhost:3000` durante el desarrollo.

### Credenciales de demostración

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `admin@invernadero.local` | `Admin123!` |
| Usuario 1 | `camila@invernadero.local` | `Usuario123!` |
| Usuario 2 | `diego@invernadero.local` | `Usuario123!` |

Estas credenciales son solo para la evaluación académica. Deben cambiarse antes de publicar un entorno real.

## Comandos

```bash
npm run dev          # web y API en paralelo
npm run dev:web      # solo Vite
npm run dev:api      # solo Express
npm run db:init      # aplica migraciones idempotentes
npm run db:seed      # carga o restaura datos de demostración
npm run typecheck    # comprueba tipos de ambos workspaces
npm test             # pruebas de API y frontend
npm run build        # genera apps/web/dist y apps/api/dist
npm run check        # tipos, verificación estática, pruebas y build
npm start            # sirve API y SPA ya compiladas en el puerto 3000
```

La base local queda en `apps/api/data/greenhouse.sqlite` y no se versiona. El seed elimina y vuelve a crear únicamente las tres cuentas académicas conocidas; no debe ejecutarse automáticamente sobre producción.

## Variables de entorno

Copiar `.env.example` a `.env`. Las variables principales son:

| Variable | Uso |
| --- | --- |
| `PORT` | Puerto de Express; predeterminado `3000` |
| `DATABASE_PATH` | Ruta del archivo SQLite |
| `APP_ORIGIN` | Orígenes exactos permitidos durante desarrollo o producción |
| `SESSION_COOKIE_NAME` | Nombre de la cookie opaca |
| `SESSION_TTL_DAYS` | Duración de la sesión |
| `TRUST_PROXY` | Activar detrás de un proxy HTTPS confiable |
| `AUTO_SEED` | Seed al iniciar; mantener `false` salvo entorno efímero controlado |
| `ALLOW_DEMO_SEED` | Autoriza el seed académico cuando `NODE_ENV=production` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Credenciales del administrador creado por el seed |
| `DEMO_USER_PASSWORD` | Contraseña de los dos usuarios de muestra |
| `VITE_API_BASE_URL` | Base de la API incorporada al frontend; usar `/api/v1` |

Nunca versionar `.env`, cookies, tokens ni bases locales.

## Arquitectura

```text
Navegador / PWA
      │ HTTPS y cookie HttpOnly
      ▼
Express ─────► React/Vite estático
  │
  ├── /api/v1/auth
  ├── /api/v1/greenhouse
  ├── /api/v1/crops
  ├── /api/v1/sensors
  ├── /api/v1/dashboard
  └── /api/v1/admin
      │
      ▼
SQLite persistente
```

El frontend nunca envía un propietario para decidir el alcance. El backend obtiene el usuario desde la sesión, deriva su invernadero y restringe las consultas. Por eso modificar un ID en la URL no permite consultar, editar ni eliminar un recurso ajeno.

Las lecturas de sensores son append-only: se crean y consultan, pero no se editan. El CRUD obligatorio se aplica a cultivos y sensores.

## API

La API usa JSON bajo `/api/v1`. Las respuestas exitosas tienen `{ "data": ... }`; las listas incluyen paginación en `meta`. Los errores usan un formato público estable con `code`, `message`, errores por campo y `requestId`, sin trazas ni SQL.

Endpoints principales:

- `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me`
- `/greenhouse`
- `/crops` y `/crops/:id`
- `/sensors`, `/sensors/:id` y `/sensors/:id/readings`
- `/dashboard/summary`
- `/admin/users`, `/admin/users/:id/resources` y `/admin/stats`
- `/health`

## Pruebas y evidencia

Las pruebas de integración del backend verifican sesión y logout, registro más único invernadero, CRUD y filtro backend, aislamiento horizontal, períodos, dashboard, permisos administrativos y borrado en cascada.

La matriz completa entre requisitos, pantallas, endpoints y evidencia está en [docs/rubrica.md](docs/rubrica.md).

## PWA

El build genera manifest, iconos de 192/512 px y service worker. Workbox precarga el app shell y recursos estáticos versionados. `/api/**` queda excluido del fallback y de la caché para impedir que datos de una cuenta reaparezcan en otra sesión.

La aplicación no simula escrituras sin conexión. Cuando no hay red, mantiene disponible la interfaz instalada y explica que una operación debe reintentarse.

## Despliegue con contenedor

El Dockerfile raíz compila ambos workspaces y sirve la SPA desde Express:

```bash
docker build -t savia .
docker volume create savia-data

# Seed inicial, una sola vez
docker run --rm \
  -v savia-data:/data \
  -e NODE_ENV=production \
  -e DATABASE_PATH=/data/greenhouse.sqlite \
  -e ALLOW_DEMO_SEED=true \
  -e ADMIN_PASSWORD='cambiar-esta-clave' \
  --entrypoint node savia apps/api/dist/scripts/seed.js

# Aplicación
docker run --name savia -p 3000:3000 \
  -v savia-data:/data \
  -e APP_ORIGIN=https://savia.example.edu \
  -e SESSION_COOKIE_NAME=savia_session \
  savia
```

SQLite requiere una sola instancia escritora y un volumen persistente. No habilitar escalado horizontal con el mismo archivo. La guía completa está en [docs/despliegue.md](docs/despliegue.md).

## Documentación

- [Arquitectura](docs/arquitectura.md)
- [Modelo de datos](docs/modelo-datos.md)
- [Trazabilidad de la rúbrica](docs/rubrica.md)
- [Despliegue](docs/despliegue.md)
- [Continuidad para otro modelo](CONTINUAR.md)

## Estado de despliegue

El proyecto queda preparado para despliegue, pero una URL pública requiere las credenciales y la plataforma que defina el equipo. No se considera desplegado hasta verificar la URL HTTPS y la persistencia después de reiniciar el servicio.
