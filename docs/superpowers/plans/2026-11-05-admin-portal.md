# Portal de Administración — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Portal admin con dashboard, gestión de familias/socios, multas, reservas y acceso a validación QR.

**Architecture:** Páginas bajo `/admin/*` protegidas por rol ADMIN. APIs bajo `/api/admin/*`. Reutiliza Prisma, Tailwind, AppNav.

**Tech Stack:** Next.js 16, Prisma 7, Tailwind, NextAuth v5.

**Spec:** `docs/superpowers/specs/2026-11-05-admin-portal-design.md`

## Global Constraints
- Shell PowerShell: usar `cmd /c`.
- Prisma client desde `@/generated/prisma/client`.
- Tests: `npm test`; typecheck: `npx tsc --noEmit`.
- Copy en español.
- Solo rol ADMIN accede a /admin.

## Review Focus
1. Un SOCIO no debe poder acceder a /admin ni a /api/admin/*.
2. Cancelar una reserva ya completada debe bloquearse.
3. Multa con monto 0 o negativo debe rechazarse.
4. Asignar rol admin a otro usuario debe requerir ser admin.

---

### Task 1: Dashboard API + página
**Files:** Create `src/app/api/admin/dashboard/route.ts`, `src/app/admin/page.tsx`
- GET dashboard: counts (familias, socios, reservas hoy, ingresos mes), últimas reservas.
- Página con tarjetas de resumen y tabla de últimas reservas.
- Commit.

### Task 2: Listado de familias admin
**Files:** Create `src/app/api/admin/families/route.ts`, `src/app/admin/familias/page.tsx`
- GET: listado paginado con búsqueda por nombre/RUT/correo.
- Página con tabla + buscador + link a detalle.
- Commit.

### Task 3: Detalle de familia admin
**Files:** Create `src/app/api/admin/families/[id]/route.ts`, `src/app/admin/familias/[id]/page.tsx`
- GET: familia + members + reservations + fines.
- PATCH: editar nombre, asignar rol (owner).
- Página con detalle, integrantes, reservas, multas.
- Commit.

### Task 4: Multas API
**Files:** Create `src/app/api/admin/fines/route.ts`, `src/app/api/admin/fines/[id]/route.ts`
- POST (via families/[id]/multas o fines): crear multa (reason, amount, familyId, memberId?).
- GET: listado (opcional por familia).
- PATCH: marcar pagada (paidAt).
- Commit.

### Task 5: Página de multas admin
**Files:** Create `src/app/admin/multas/page.tsx`
- Listado de multas + formulario para crear.
- Commit.

### Task 6: Reservas admin
**Files:** Create `src/app/api/admin/reservations/route.ts`, `src/app/admin/reservas/page.tsx`
- GET: listado por fecha (query param date).
- PATCH: cancelar reserva.
- Página con tabla + filtro fecha + cancelar.
- Commit.

### Task 7: Navegación admin
**Files:** Modify `src/components/AppNav.tsx` (agregar link a /admin si admin) o crear AdminNav.
- Commit.

### Task 8: Verificación final
- npm test, tsc, build, push.
