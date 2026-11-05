# Diseño: Portal de Administración (Plan 2)

**Fecha:** 2026-11-05
**Proyecto:** Parcela SSCC

## Intención
Dar al admin (y futuros admins) un portal para gestionar familias/socios, emitir multas, ver reservas y estadísticas, y acceder a la validación QR. Hoy solo existe la importación de núcleos.

## Objetivos
1. Dashboard con resumen del día/semana (reservas, ingresos, familias).
2. Gestión de familias y socios: listado, búsqueda, ver/editar, asignar rol admin.
3. Multas: crear (motivo + monto) a familia/integrante, listado, marcar pagada.
4. Reservas admin: ver todas por fecha, cancelar, ver pagos/QR.
5. Acceso rápido a validación QR (ya existe en /validar/[token]).

## No-objetivos
- No cambiar el flujo de pago (MP pendiente).
- No app móvil para el guardia (usa el navegador).

## Enfoque
Páginas bajo `/admin/*` protegidas por rol ADMIN (middleware ya protege `/admin`). APIs bajo `/api/admin/*`. Reutilizar Prisma, Tailwind, AppNav.

## Pantallas
- `/admin` — Dashboard.
- `/admin/familias` — listado + búsqueda + detalle.
- `/admin/familias/[id]` — detalle, editar, multas.
- `/admin/multas` — listado + crear.
- `/admin/reservas` — listado por fecha + cancelar.
- `/admin/validar` — acceso rápido a QR (link a /validar).

## APIs nuevas
- GET /api/admin/dashboard (stats).
- GET /api/admin/families (listado paginado + búsqueda).
- GET/PATCH /api/admin/families/[id].
- POST /api/admin/families/[id]/multas (crear multa).
- GET /api/admin/fines (listado).
- PATCH /api/admin/fines/[id] (marcar pagada).
- GET /api/admin/reservations (listado por fecha).
- PATCH /api/admin/reservations/[id] (cancelar).

## Roles
- SOCIO: acceso normal.
- ADMIN: acceso a /admin/* + puede emitir multas + asignar admin a otros.

## Restricciones
- Solo ADMIN accede.
- Multas requieren motivo y monto > 0.
- Cancelar reserva solo si no está completada.

## Aprobación
Aprobado por el usuario ("como dices esta ok").
