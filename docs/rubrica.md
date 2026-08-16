# Trazabilidad de la rúbrica

_Matriz de requisitos, interfaz, API y evidencia de aceptación para Savia._

---

## 📋 Cómo usar esta matriz

Cada fila define qué debe demostrarse durante la evaluación. La columna de evidencia describe una prueba reproducible; no debe marcarse como cumplida solo porque exista una pantalla o un endpoint.

La evidencia final debe conservar, según corresponda:

- Resultado automatizado de pruebas unitarias, de integración o end-to-end
- Captura o video corto con URL visible para interacción y diseño responsivo
- Solicitud y respuesta de API sin credenciales ni datos sensibles
- Salida del build, auditoría PWA y smoke test de producción
- Datos preparados para dos usuarios normales y un administrador

## 🔐 Autenticación y aislamiento

| Requisito | Pantalla | Endpoint | Evidencia o prueba |
| --- | --- | --- | --- |
| **Iniciar sesión** | `/login` | `POST /api/v1/auth/login` | Login válido redirige al resumen; credenciales inválidas muestran mensaje público y no crean sesión |
| **Cerrar sesión** | Menú de cuenta | `POST /api/v1/auth/logout` | Tras cerrar sesión, `GET /auth/me` devuelve `401` y volver atrás no expone datos privados |
| **Identificar al usuario** | Encabezado y perfil | `GET /api/v1/auth/me` | Recargar conserva la identidad mientras la sesión siga vigente; la respuesta no contiene hash ni token |
| **Consultar el invernadero propio** | `/app/invernadero` | `GET /api/v1/greenhouse` | Usuario A obtiene su único invernadero y nunca el de B |
| **Restringir recursos por propietario** | Todas las vistas privadas | Todas las rutas de cultivos, sensores y registros | Prueba de integración usa un ID de B con sesión de A en `GET`, `PATCH` y `DELETE`; responde `404` y no cambia datos |
| **Restringir funciones administrativas** | `/admin/**` | `/api/v1/admin/**` | Usuario normal recibe `403`; administrador recibe `200`; la navegación normal no muestra enlaces administrativos |
| **Proteger la sesión** | No aplica | Middleware de sesión | Cookie `HttpOnly`, `SameSite=Lax` y `Secure` en HTTPS; el token no aparece en almacenamiento web ni respuestas JSON |

## 📚 Gestión, consultas y visualización

| Requisito | Pantalla | Endpoint | Evidencia o prueba |
| --- | --- | --- | --- |
| **Crear cultivos** | `/app/cultivos` | `POST /api/v1/crops` | Formulario válido crea un cultivo del invernadero autenticado y lo muestra sin recargar toda la aplicación |
| **Consultar cultivos** | `/app/cultivos` | `GET /api/v1/crops` y `GET /api/v1/crops/:id` | Lista y detalle muestran solo recursos propios; estados vacío, carga y error son visibles |
| **Modificar cultivos** | Edición en `/app/cultivos` | `PATCH /api/v1/crops/:id` | Cambio válido persiste después de recargar; fechas o estados inválidos muestran error por campo |
| **Eliminar cultivos** | Confirmación en `/app/cultivos` | `DELETE /api/v1/crops/:id` | Confirmar elimina y devuelve `204`; cancelar no cambia datos; ID ajeno no se elimina |
| **Filtrar cultivos en backend** | Filtros de `/app/cultivos` | `GET /api/v1/crops?q=&status=&plantedFrom=&plantedTo=` | Prueba llama directamente a la API con filtros y verifica resultados y total; no se filtra una lista completa solo en React |
| **Crear sensores** | `/app/sensores` | `POST /api/v1/sensors` | Sensor válido queda asociado al invernadero de la sesión; tipo inválido se rechaza y la unidad se deriva en el servidor |
| **Consultar sensores** | `/app/sensores` | `GET /api/v1/sensors` y `GET /api/v1/sensors/:id` | Lista, detalle y estado activo pertenecen al usuario autenticado |
| **Modificar sensores** | Edición en `/app/sensores` | `PATCH /api/v1/sensors/:id` | Edición persiste y no permite cambiar `greenhouseId` ni propietario desde el cuerpo |
| **Eliminar sensores** | Confirmación en `/app/sensores` | `DELETE /api/v1/sensors/:id` | La interfaz advierte sobre el historial; la eliminación confirmada aplica la cascada esperada |
| **Registrar datos históricos** | Formulario de demo o carga del sensor | `POST /api/v1/sensors/:id/readings` | Se crean varias lecturas con fechas diferentes; se rechazan valores no numéricos, fechas inválidas y sensores ajenos |
| **Consultar historial** | `/app/sensores/:id/historial` | `GET /api/v1/sensors/:id/readings` | La API devuelve lecturas ordenadas del sensor propio y metadatos de consulta |
| **Filtrar datos por período** | Selector de fechas del historial | `GET /api/v1/sensors/:id/readings?from=&to=` | Fechas límite incluidas, `from > to` rechazado y ninguna fila fuera del período |
| **Visualizar gráficos** | `/app/sensores/:id/historial` | Mismo endpoint de historial | Gráfico refleja etiquetas, unidad y valores de la respuesta; maneja cero, una y múltiples lecturas sin error de consola |
| **Mostrar resumen de actividad** | `/app/resumen` | `GET /api/v1/dashboard/summary?from=&to=` | Tarjetas muestran totales de cultivos, sensores y registros propios; los totales coinciden con consultas directas |

## 👥 Funciones administrativas

| Requisito | Pantalla | Endpoint | Evidencia o prueba |
| --- | --- | --- | --- |
| **Consultar usuarios** | `/admin/usuarios` | `GET /api/v1/admin/users?q=&page=&limit=` | Administrador pagina y busca usuarios sin recibir hashes de contraseña ni sesiones |
| **Consultar recursos asociados** | `/admin/usuarios/:id` | `GET /api/v1/admin/users/:id/resources?type=&page=&limit=` | Vista entrega detalle, conteos y recursos paginados del usuario seleccionado |
| **Eliminar cuenta y registros** | Confirmación en detalle de usuario | `DELETE /api/v1/admin/users/:id` | Prueba prepara usuario con cultivos, sensores, lecturas y sesiones; tras eliminar, todos los conteos quedan en cero |
| **Consultar estadísticas globales** | `/admin/estadisticas` | `GET /api/v1/admin/stats` | Totales globales coinciden con fixtures de varios usuarios y difieren del resumen personal |
| **Evitar autoeliminación accidental** | Confirmación administrativa | `DELETE /api/v1/admin/users/:id` | El administrador activo no puede eliminar su propia cuenta sin una política explícita; recibe error comprensible |

## 🌐 Requisitos técnicos comunes

| Requisito | Pantalla | Endpoint | Evidencia o prueba |
| --- | --- | --- | --- |
| **HTML, CSS, JavaScript y framework** | Aplicación completa | No aplica | Build de `apps/web` genera el frontend React/Vite sin errores |
| **Diseño responsivo** | Login, resumen, listados, formularios, historial y admin | No aplica | Prueba visual y de interacción en escritorio, `390px` y `320px`; sin desborde horizontal no intencional |
| **Interacción comprensible** | Formularios, diálogos y estados | No aplica | Navegación por teclado, foco visible, etiquetas asociadas, confirmación de borrado y mensajes de éxito/error |
| **Backend propio y API** | Aplicación completa | `/api/v1/**` | Pruebas de integración ejercitan HTTP real; React no accede directamente al archivo SQLite |
| **Separación por capas** | No aplica | Rutas, servicios y repositorios | Revisión de código confirma controladores sin SQL y repositorios sin decisiones de presentación |
| **Persistencia tras reinicio** | Cualquier CRUD | Endpoints de recursos | Crear datos, detener y reiniciar API, volver a consultar y comprobar que permanecen |
| **Modelo y relaciones** | No aplica | Todas las escrituras | Migración activa claves foráneas, unicidad usuario-invernadero e índices históricos |
| **Validación en backend** | Todos los formularios | Todos los `POST` y `PATCH` | Omitir el frontend y enviar JSON inválido; API rechaza, no persiste y devuelve error por campo |
| **Manejo seguro de errores** | Avisos y páginas de error | Toda la API | Solicitud inválida no expone SQL, stack, rutas internas, contraseña ni cookie; incluye `requestId` |
| **Manifest instalable** | Aplicación completa | `/manifest.webmanifest` | Navegador reconoce nombre, iconos, `start_url`, colores y modo `standalone` |
| **Service worker y caché** | Aplicación completa | Recursos estáticos | Auditoría confirma registro y precaché; `/api/v1/**` permanece `NetworkOnly` y no reaparece información de otra sesión |
| **Adaptación móvil PWA** | Aplicación instalada | No aplica | Flujo principal funciona en modo `standalone`, orientación móvil y áreas seguras |
| **Frontend y backend desplegados** | URL pública única | `/api/v1/health` y SPA | Smoke test HTTPS carga una ruta profunda, inicia sesión, consulta API y no presenta CORS |
| **Persistencia desplegada** | CRUD en producción de prueba | Endpoints de recursos | Crear dato, reiniciar el servicio desplegado y verificar que el volumen SQLite lo conserva |
| **Repositorio y documentación** | No aplica | No aplica | Incluye instalación, variables, arquitectura, modelo, despliegue y uso; un compañero ejecuta el proyecto desde cero |
| **Calidad de código** | No aplica | No aplica | `npm run check` ejecuta tipos, lint, pruebas y build con salida exitosa en entorno limpio |

## ✅ Recorrido mínimo de demostración

1. Iniciar sesión como usuario A y mostrar su resumen.
2. Crear, editar, filtrar y eliminar un cultivo.
3. Crear y editar un sensor; registrar lecturas en fechas distintas.
4. Filtrar el historial y comprobar el gráfico.
5. Intentar acceder con A a un recurso preparado para B y mostrar el rechazo.
6. Iniciar sesión como administrador, consultar usuarios y estadísticas.
7. Eliminar una cuenta de demostración y comprobar sus cascadas.
8. Instalar o auditar la PWA en vista móvil.
9. Reiniciar la aplicación desplegada y comprobar persistencia.

> ⚠️ **Advertencia:** Las capturas son evidencia complementaria. Las reglas de autorización, filtros y cascadas deben demostrarse con pruebas de backend porque la interfaz puede ocultar controles sin proteger realmente los datos.
