# Plan 1: Núcleo (MVP) — Sistema de reservas de la Parcela SSCC

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar un MVP funcional donde un integrante del núcleo familiar de un socio pueda registrarse, reservar la parcela por día (con espacios arrendables e invitados extra), pagar, recibir un código QR de ingreso y un correo de confirmación.

**Architecture:** Next.js (App Router) full-stack con TypeScript, Prisma + PostgreSQL, Tailwind + shadcn/ui. La autenticación es email/contraseña con roles (socio, admin). Las reservas son por día completo, múltiples familias el mismo día. El pago confirma la reserva y genera un QR validable. Correo transaccional para confirmación.

**Tech Stack:** Next.js 15, TypeScript, Prisma, PostgreSQL, Tailwind CSS, shadcn/ui, NextAuth.js (Auth.js), Mercado Pago SDK, qrcode, Resend (correo).

**Spec:** docs/superpowers/specs/2026-11-04-parcela-sscc-reservas-design.md

## Global Constraints

- Idioma español en toda la UI y correos.
- Plataforma web responsive (mobile-first).
- Un solo administrador inicialmente (rol `admin`).
- Pagos reales vía pasarela (Mercado Pago); confirmación por webhook.
- Reserva por día completo; sin límite de capacidad.
- Invitado extra (no del núcleo) genera cargo adicional; uso de piscina genera cargo adicional.
- Espacios arrendables con precio propio: quincho, sala de eventos, sala cafetería (estas dos últimas para una sola familia con X invitados).
- Código QR generado al confirmar el pago, validable en una página pública.

## Review Focus

- **Reserva duplicada para el mismo día por la misma familia:** debe bloquearse; una familia no puede tener dos reservas activas el mismo día.
- **Pago de monto incorrecto / webhook replay:** el webhook debe ser idempotente; un pago duplicado no debe crear dos reservas confirmadas.
- **Invitado extra sin cargo:** el total debe recalcularse siempre en servidor, nunca confiar en el cliente.
- **QR adivinable / reutilizable:** el token del QR debe ser opaco y de un solo uso efectivo (validación registra el ingreso).
- **Registro de integrante no-socio:** solo socios verificados pueden crear núcleo familiar; un usuario suelto no debe poder reservar.

---

### Task 1: Scaffolding del proyecto

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`
- Create: `prisma/schema.prisma`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`
- Create: `.env.example`

**Interfaces:**
- Produces: estructura base del proyecto Next.js + Prisma + Tailwind lista para `npm run dev`.

- [ ] **Step 1: Crear proyecto Next.js con TypeScript, Tailwind y App Router**

Run: `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm`
Expected: proyecto creado sin errores.

- [ ] **Step 2: Instalar dependencias**

Run: `npm install prisma @prisma/client next-auth@beta @auth/prisma-adapter zod bcryptjs qrcode resend mercadopago`
Expected: dependencias instaladas.

Run: `npm install -D @types/bcryptjs @types/qrcode`
Expected: tipos instalados.

- [ ] **Step 3: Inicializar Prisma**

Run: `npx prisma init`
Expected: crea `prisma/schema.prisma` y `.env` con `DATABASE_URL`.

- [ ] **Step 4: Configurar variables de entorno de ejemplo**

Crear `.env.example` con:
```
DATABASE_URL="postgresql://user:pass@localhost:5432/parcela_sscc"
NEXTAUTH_SECRET="change-me"
NEXTAUTH_URL="http://localhost:3000"
MERCADOPAGO_ACCESS_TOKEN=""
RESEND_API_KEY=""
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

- [ ] **Step 5: Verificar que arranca**

Run: `npm run dev`
Expected: servidor en http://localhost:3000 sin errores.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: scaffold Next.js + Prisma + Tailwind project"
```

---

### Task 2: Esquema de base de datos

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Modify: `package.json` (script seed)

**Interfaces:**
- Produces: modelos `User`, `Family`, `FamilyMember`, `Reservation`, `ReservationAddOn`, `ExtraPerson`, `AddOnSpace`, `Payment`, `QrToken`, `Fine`, `Visit`.

- [ ] **Step 1: Escribir el schema de Prisma**

Definir los modelos con las relaciones del spec. Claves:
- `User`: id, email, passwordHash, role (SOCIO | ADMIN), familyId?, createdAt.
- `Family`: id, name, ownerId (User), members (FamilyMember[]), reservations.
- `FamilyMember`: id, familyId, userId?, fullName, relation, createdAt. (userId opcional: un integrante puede tener cuenta propia o no.)
- `Reservation`: id, familyId, date (Date), status (PENDIENTE_PAGO | CONFIRMADA | COMPLETADA | CANCELADA), totalAmount, createdAt, updatedAt. Unique constraint (familyId, date) para evitar duplicados.
- `ReservationAddOn`: id, reservationId, addOnSpaceId, quantity.
- `ExtraPerson`: id, reservationId, fullName, usesPool (bool).
- `AddOnSpace`: id, name (quincho | sala_eventos | sala_cafeteria), pricePerUnit, capacityGuests (nullable).
- `Payment`: id, reservationId, provider, providerPaymentId, amount, status, paidAt.
- `QrToken`: id, reservationId, token (unique), usedAt (nullable), createdAt.
- `Fine`: id, familyId, familyMemberId?, reason, amount, issuedBy (userId), createdAt.
- `Visit`: id, reservationId, checkedInAt, checkedInBy.

- [ ] **Step 2: Generar migración y aplicar**

Run: `npx prisma migrate dev --name init`
Expected: migración creada y aplicada.

- [ ] **Step 3: Crear seed con espacios arrendables**

Crear `prisma/seed.ts` que inserte los 3 `AddOnSpace` (quincho, sala de eventos, sala cafetería) con precios placeholder (0) y capacidad de invitados para las salas.

Run: `npx prisma db seed`
Expected: espacios creados.

- [ ] **Step 4: Verificar con Prisma Studio**

Run: `npx prisma studio`
Expected: modelos visibles.

- [ ] **Step 5: Commit**

```bash
git add prisma/
git commit -m "feat: add database schema and seed for add-on spaces"
```

---

### Task 3: Autenticación y núcleo familiar

**Files:**
- Create: `src/lib/auth.ts`, `src/lib/prisma.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`
- Create: `src/app/api/families/route.ts`, `src/app/api/families/[id]/members/route.ts`
- Create: `src/middleware.ts`

**Interfaces:**
- Consumes: `prisma` client, `User`, `Family`, `FamilyMember` models.
- Produces: `auth()` helper (session), `requireRole(role)`, endpoints de registro/login y gestión de núcleo familiar.

- [ ] **Step 1: Escribir test de registro**

Test: `POST /api/auth/register` con email/password crea `User` con rol SOCIO y devuelve 201. Email duplicado devuelve 409.

- [ ] **Step 2: Implementar registro**

Crear endpoint que valide con zod, hashee contraseña con bcrypt, cree User. Si el email ya existe, 409.

- [ ] **Step 3: Configurar NextAuth (Auth.js) con credenciales**

Configurar provider de credenciales: buscar User por email, verificar contraseña con bcrypt, devolver session con id y role.

- [ ] **Step 4: Crear páginas de login y registro**

Formularios con validación cliente (zod) y llamada a la API / NextAuth signIn.

- [ ] **Step 5: Middleware de protección de rutas**

Proteger `/reservar`, `/mis-reservas`, `/admin` (admin solo). Redirigir a login si no hay sesión.

- [ ] **Step 6: Endpoints de núcleo familiar**

`POST /api/families` crea Family para el socio autenticado (solo si no tiene una).
`POST /api/families/[id]/members` agrega integrante (fullName, relation). Si se proporciona email, crear User con rol SOCIO vinculado.

- [ ] **Step 7: Verificar flujo manual**

Registrar socio, crear núcleo familiar con 2 integrantes, iniciar sesión con un integrante.

- [ ] **Step 8: Commit**

```bash
git add src/
git commit -m "feat: add auth and family nucleus management"
```

---

### Task 4: Reserva por día + espacios arrendables

**Files:**
- Create: `src/app/reservar/page.tsx`
- Create: `src/app/api/reservations/route.ts`, `src/app/api/reservations/[id]/route.ts`
- Create: `src/app/api/addon-spaces/route.ts`
- Create: `src/lib/pricing.ts`

**Interfaces:**
- Consumes: `Family`, `Reservation`, `AddOnSpace`, `auth()`.
- Produces: `calculateTotal(reservationInput): number`, endpoint de creación de reserva en estado PENDIENTE_PAGO.

- [ ] **Step 1: Escribir test de pricing**

Test: `calculateTotal` con núcleo base + 2 invitados extra + 1 con piscina + quincho devuelve la suma correcta según precios de AddOnSpace.

- [ ] **Step 2: Implementar `calculateTotal`**

Función pura que recibe la reserva (invitados extra, piscina, add-ons) y los precios, devuelve total. Validar en servidor al crear reserva.

- [ ] **Step 3: Escribir test de creación de reserva**

Test: `POST /api/reservations` crea reserva PENDIENTE_PAGO; segunda reserva del mismo family+date devuelve 409.

- [ ] **Step 4: Implementar endpoint de creación**

Validar con zod: date (futura), invitados extra, add-ons. Verificar que no exista reserva activa del mismo family+date. Calcular total en servidor. Crear Reservation + ExtraPerson + ReservationAddOn en transacción.

- [ ] **Step 5: Crear página de reserva**

Calendario por día (input date), selección de espacios arrendables, contador de invitados extra y piscina, resumen de total, botón "Reservar y pagar".

- [ ] **Step 6: Verificar flujo manual**

Crear reserva completa, verificar en DB.

- [ ] **Step 7: Commit**

```bash
git add src/
git commit -m "feat: add day reservation with add-on spaces and pricing"
```

---

### Task 5: Pago real + generación de QR

**Files:**
- Create: `src/app/api/payments/create-preference/route.ts`
- Create: `src/app/api/payments/webhook/route.ts`
- Create: `src/app/api/qr/[token]/route.ts`
- Create: `src/lib/qr.ts`
- Create: `src/app/validar/[token]/page.tsx`

**Interfaces:**
- Consumes: `Reservation`, `Payment`, `QrToken`, Mercado Pago SDK.
- Produces: preferencia de pago, webhook idempotente que confirma reserva y genera QR, página pública de validación.

- [ ] **Step 1: Escribir test de webhook idempotente**

Test: procesar el mismo `providerPaymentId` dos veces no crea dos pagos ni dos QR.

- [ ] **Step 2: Implementar creación de preferencia**

`POST /api/payments/create-preference` recibe reservationId, crea preferencia en Mercado Pago con el total, devuelve init_point. Guardar referencia.

- [ ] **Step 3: Implementar webhook**

`POST /api/payments/webhook` recibe notificación, consulta el pago a Mercado Pago, si aprobado: crear Payment (si no existe por providerPaymentId), actualizar Reservation a CONFIRMADA, generar QrToken (token opaco, crypto.randomUUID), enviar correo de confirmación.

- [ ] **Step 4: Implementar generación de QR**

`src/lib/qr.ts`: función que genera data URL del QR apuntando a `${APP_URL}/validar/${token}`.

- [ ] **Step 5: Página de validación**

`/validar/[token]`: busca QrToken; si no existe → inválido; si existe y no usado → marca usedAt, muestra datos de la reserva (familia, fecha, espacios); si ya usado → muestra "ya validado" con fecha de uso.

- [ ] **Step 6: Verificar flujo end-to-end con Mercado Pago sandbox**

Crear reserva, pagar en sandbox, verificar confirmación y QR.

- [ ] **Step 7: Commit**

```bash
git add src/
git commit -m "feat: add real payment, QR generation and validation page"
```

---

### Task 6: Correo de confirmación

**Files:**
- Create: `src/lib/email.ts`
- Create: `src/emails/confirmacion-reserva.tsx` (o template HTML)
- Modify: webhook para disparar envío

**Interfaces:**
- Consumes: Resend SDK, datos de la reserva confirmada + QR.
- Produces: función `sendConfirmationEmail(reservation)`.

- [ ] **Step 1: Escribir test de email (mock)**

Test: `sendConfirmationEmail` llama al proveedor con el email del titular y contiene el token del QR.

- [ ] **Step 2: Implementar `sendConfirmationEmail`**

Usar Resend. Template con: fecha, familia, espacios reservados, invitados extra, monto pagado, QR (imagen inline o link).

- [ ] **Step 3: Disparar desde webhook**

Después de confirmar la reserva y generar el QR, llamar a `sendConfirmationEmail`. Si falla el correo, loguear pero no revertir la confirmación (el pago ya se hizo).

- [ ] **Step 4: Verificar recepción de correo en sandbox**

Realizar pago sandbox completo, verificar correo recibido con QR.

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: add reservation confirmation email with QR"
```

---

## Self-Review

Spec coverage check:
- Reserva por día → Task 4 ✓
- Múltiples familias el mismo día (sin límite) → Task 4 (sin restricción de capacidad) ✓
- Invitado extra + piscina → Task 4 (pricing) ✓
- Espacios arrendables → Task 2 (seed) + Task 4 ✓
- Pago real + QR → Task 5 ✓
- Perfil por integrante + registro → Task 3 ✓
- Correo de confirmación → Task 6 ✓
- Admin inicial por el dueño → rol admin en Task 3; panel completo va en Plan 2 ✓

Review Focus tests added:
- Reserva duplicada mismo día → Task 4 Step 3 ✓
- Webhook replay/idempotencia → Task 5 Step 1 ✓
- Total calculado en servidor → Task 4 Step 2 ✓
- QR opaco y validación de uso → Task 5 Step 5 ✓
- Solo socios pueden reservar → Task 3 (middleware + roles) + Task 4 (validación de familia) ✓