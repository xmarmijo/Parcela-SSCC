# Importación de núcleos familiares — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir al admin importar núcleos familiares desde un Excel y vincularlos automáticamente a los socios al registrarse/iniciar sesión, sin duplicados.

**Architecture:** Migración Prisma que hace opcional el dueño del núcleo y agrega campos (RUT, curso, exalumno, email) a integrantes y usuarios. Endpoint de importación admin (exceljs), vinculación perezosa por correo/RUT, y UI de edición en `/familia`.

**Tech Stack:** Next.js 16 App Router, Prisma 7, PostgreSQL (Neon), Tailwind, `exceljs`, `zod`, NextAuth v5.

**Spec:** `docs/superpowers/specs/2026-11-05-importacion-nucleos-design.md`

## Global Constraints

- Shell PowerShell: usar `cmd /c` con `cd /d "<ruta>"` para npm/prisma.
- Prisma client se importa desde `@/generated/prisma/client`.
- Migraciones: `npx prisma migrate dev` (local) y `npx prisma migrate deploy` (prod/Neon).
- Tests: `npm test` (tsx --test tests/*.test.ts), deben seguir pasando (64/64).
- Tipos: `npx tsc --noEmit` debe pasar.
- Copy en español, UI responsive.
- No guardar fotos.

## Review Focus

1. Un integrante que se registra antes que el titular debe ver el núcleo en modo solo lectura, no crear uno nuevo.
2. Un titular que ya creó su núcleo manualmente no debe perderlo al importar uno con su RUT/correo.
3. RUT con formatos distintos (`12.345.678-9`, `12345678-9`, `123456789`) deben normalizarse y coincidir.
4. Un núcleo importado sin titular registrado no debe aparecer como "familia propia" de nadie hasta que el titular se registre.
5. Editar/eliminar integrantes solo titular o admin; un integrante vinculado no puede borrar el núcleo.
6. Registrarse con un RUT ya vinculado a un núcleo debe bloquearse con mensaje claro y contacto a admin.

---

### Task 1: Migración de esquema Prisma

**Files:**
- Modify: `prisma/schema.prisma`
- Create: migración en `prisma/migrations/`

**Interfaces:**
- Produces: `Family.ownerId` opcional, `Family.importKey String? @unique`, `Family.importedAt DateTime?`, `FamilyMember.rut/email/course/exAlumno`, `User.rut String @unique` (obligatorio).

- [ ] **Step 1: Editar schema.prisma** — `ownerId String?`, agregar campos listados, `User.rut`.
- [ ] **Step 2: Generar migración** — Run: `npx prisma migrate dev --name import_nucleos` (en workdir del proyecto). Expected: migración creada y aplicada a Neon.
- [ ] **Step 3: Regenerar client** — Run: `npx prisma generate`. Expected: sin errores.
- [ ] **Step 4: Typecheck** — Run: `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** — `git add prisma/ src/generated/prisma/ && git commit -m "feat(db): schema para importacion de nucleos"`

---

### Task 2: Helper de normalización de RUT

**Files:**
- Create: `src/lib/rut.ts`
- Test: `tests/rut.test.ts`

**Interfaces:**
- Produces: `normalizeRut(input: string): string` (sin puntos, guión, K mayúscula) y `isValidRut(input: string): boolean`.

- [ ] **Step 1: Write failing test** en `tests/rut.test.ts` con casos: `"12.345.678-9" → "12345678-9"`, `"123456789" → "12345678-9"`, `"12345678-k" → "12345678-K"`.
- [ ] **Step 2: Run test** — Expected: FAIL.
- [ ] **Step 3: Implementar `normalizeRut` y `isValidRut` en `src/lib/rut.ts`.
- [ ] **Step 4: Run test** — Expected: PASS.
- [ ] **Step 5: Commit**.

---

### Task 3: Lookup de familia por dueño o integrante

**Files:**
- Create: `src/lib/family-lookup.ts`
- Test: `tests/family-lookup.test.ts`

**Interfaces:**
- Produces: `findFamilyForUser(userId: string): Promise<Family | null>` que busca primero por `ownerId`, luego por `FamilyMember.userId`.

- [ ] **Step 1: Write failing test** mockeando prisma (seguir patrón de tests existentes con `__mockSession`/`globalThis`).
- [ ] **Step 2: Run test** — FAIL.
- [ ] **Step 3: Implementar en `src/lib/family-lookup.ts`.
- [ ] **Step 4: Run test** — PASS.
- [ ] **Step 5: Commit**.

---

### Task 4: Actualizar GET /api/families

**Files:**
- Modify: `src/app/api/families/route.ts` (GET)

**Interfaces:**
- Consumes: `findFamilyForUser` de Task 3.
- Produces: mismo JSON, ahora incluye núcleo donde el usuario es integrante.

- [ ] **Step 1: Ajustar GET para usar `findFamilyForUser` y incluir members con rut/course/exAlumno/email.
- [ ] **Step 2: Typecheck + tests** — `npm test` PASS.
- [ ] **Step 3: Commit**.

---

### Task 5: PATCH y DELETE de integrantes

**Files:**
- Create: `src/app/api/families/[id]/members/[memberId]/route.ts`

**Interfaces:**
- Produces: `PATCH` (edita fullName, relation, rut, course, exAlumno, email) y `DELETE`.

- [ ] **Step 1: Write failing test** en `tests/families.test.ts` agregando casos PATCH/DELETE con permisos.
- [ ] **Step 2: Run test** — FAIL.
- [ ] **Step 3: Implementar handlers con validación de permisos (owner o admin).
- [ ] **Step 4: Run test** — PASS.
- [ ] **Step 5: Commit**.

---

### Task 6: Vinculación automática en registro (RUT obligatorio)

**Files:**
- Modify: `src/app/api/auth/register/route.ts` (o equivalente)
- Modify: `src/app/(auth)/register/page.tsx`

**Interfaces:**
- Consumes: `normalizeRut`, prisma.
- Produces: campo `rut` obligatorio en registro; al crear User, bloquear si el RUT ya pertenece a un núcleo; vincular núcleo importado por email/rut.

- [ ] **Step 1: Agregar campo RUT obligatorio al formulario de registro.
- [ ] **Step 2: Actualizar endpoint de registro para aceptar `rut`, normalizar, validar duplicado (error: "Este RUT ya pertenece a un núcleo familiar. Si no es así, contacta al administrador."), y vincular.
- [ ] **Step 3: Tests** — `tests/auth-register.test.ts` agregar casos de vinculación y de RUT duplicado.
- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit**.

---

### Task 7: Vinculación perezosa (lazy) al iniciar sesión

**Files:**
- Create: `src/app/api/families/link/route.ts`
- Modify: `src/app/familia/page.tsx` (llamar a `/api/families/link` al montar)

**Interfaces:**
- Produces: endpoint idempotente que vincula el usuario actual con núcleos importados por email/rut.

- [ ] **Step 1: Implementar endpoint.
- [ ] **Step 2: Llamar desde FamiliaPage en useEffect.
- [ ] **Step 3: Typecheck + tests.
- [ ] **Step 4: Commit**.

---

### Task 8: Plantilla Excel y endpoint de descarga

**Files:**
- Create: `src/app/api/admin/families/template/route.ts`
- Add dependency: `exceljs`

**Interfaces:**
- Produces: `GET` que devuelve `.xlsx` con columnas y fila de ejemplo Moncada.

- [ ] **Step 1: `npm install exceljs`.
- [ ] **Step 2: Implementar generación del template.
- [ ] **Step 3: Verificar descarga manual.
- [ ] **Step 4: Commit**.

---

### Task 9: Endpoint de importación admin

**Files:**
- Create: `src/app/api/admin/families/import/route.ts`

**Interfaces:**
- Produces: `POST` multipart con archivo; retorna `{ created, updated, members, errors[] }`.

- [ ] **Step 1: Write failing test** (mock de exceljs o test de normalización de filas).
- [ ] **Step 2: Implementar parseo, agrupación por `id_nucleo`, upsert Family + FamilyMember.
- [ ] **Step 3: Validar rol ADMIN.
- [ ] **Step 4: Run tests** — PASS.
- [ ] **Step 5: Commit**.

---

### Task 10: Pantalla admin de importación

**Files:**
- Create: `src/app/admin/familias/importar/page.tsx`
- Modify: `src/components/AppNav.tsx` o admin nav para enlazar.

**Interfaces:**
- Consumes: endpoints de Task 8 y 9.

- [ ] **Step 1: UI con descarga de plantilla, selector de archivo, importar, resumen.
- [ ] **Step 2: Typecheck.
- [ ] **Step 3: Commit**.

---

### Task 11: UI de familia actualizada

**Files:**
- Modify: `src/app/familia/page.tsx`

**Interfaces:**
- Consumes: GET /api/families (con nuevos campos), PATCH/DELETE endpoints.

- [ ] **Step 1: Mostrar RUT, curso, exalumno, email por integrante.
- [ ] **Step 2: Botones editar/eliminar (titular/admin).
- [ ] **Step 3: Aviso si núcleo importado sin titular.
- [ ] **Step 4: Typecheck.
- [ ] **Step 5: Commit**.

---

### Task 12: Verificación final

- [ ] **Step 1: `npm test`** — Expected: todos PASS (existentes + nuevos).
- [ ] **Step 2: `npx tsc --noEmit`** — PASS.
- [ ] **Step 3: `npm run build`** — PASS.
- [ ] **Step 4: Deploy a Vercel** y probar importación con Excel de ejemplo.
- [ ] **Step 5: Commit final + push**.

---

## Notas

- La plantilla Excel se te entregará aparte (archivo `plantilla-nucleos.xlsx`) con una fila de ejemplo de la familia Moncada para que la completes.
- Si el colegio entrega la lista con columnas distintas, ajustamos el mapeo en Task 9 sin tocar el resto.
