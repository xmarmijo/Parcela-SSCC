# Parcela SSCC — Sistema de Reservas

Sistema web de reservas de la **Parcela SSCC** para los apoderados socios del **Colegio SSCC**.

## Funcionalidades (Plan 1 — Núcleo MVP)

- **Autenticación** por email/contraseña con roles (socio / admin).
- **Núcleo familiar**: cada socio registra a su familia e integra a sus miembros (con o sin cuenta propia).
- **Reserva por día**: calendario de disponibilidad, múltiples familias el mismo día (sin límite de capacidad).
- **Espacios arrendables** con precio propio: quincho, sala de eventos, sala cafetería (estas dos últimas para una familia con invitados).
- **Invitados extra**: cargo adicional por persona ajena al núcleo; cargo extra si usan la piscina.
- **Pago real** vía Mercado Pago; el pago confirma la reserva.
- **Código QR** de ingreso (un solo uso) con página pública de validación.
- **Correo de confirmación** con datos de la reserva y el QR.

## Stack

- Next.js 15 (App Router) + TypeScript
- Prisma + PostgreSQL
- Tailwind CSS + shadcn/ui
- NextAuth.js (Auth.js)
- Mercado Pago SDK
- Resend (correo transaccional)

## Requisitos

- Node.js 18+
- PostgreSQL (local o cloud: Neon, Supabase, etc.)

## Instalación

```bash
git clone https://github.com/TU_USUARIO/parcela-sscc.git
cd parcela-sscc
npm install
cp .env.example .env
# edita .env con tu DATABASE_URL y claves
npx prisma migrate dev
npx prisma db seed
npm run dev
```

La app queda en http://localhost:3000.

## Pruebas

```bash
npm test
```

64 tests (auth, familias, reservas, pagos/QR, correo).

## Estructura

```
src/
  app/            # páginas y API routes (Next.js App Router)
  lib/            # auth, prisma, pricing, qr, email
  emails/         # templates de correo
prisma/           # schema, migraciones, seed
tests/            # tests unitarios e integración
```

## Planes futuros

- **Plan 2:** panel de administración, multas, roles/privilegios, estadísticas.
- **Plan 3:** recordatorio previo a la visita y aviso de multa por correo.

## Licencia

Privado — uso interno del Colegio SSCC.