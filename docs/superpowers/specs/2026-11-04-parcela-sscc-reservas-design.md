# Design: Sistema de reservas de la Parcela SSCC

**Fecha:** 2026-11-04
**Cliente:** Colegio SSCC (administrado inicialmente por el dueño del proyecto)

## Intent y por qué

Los apoderados que son **socios** del Colegio SSCC pueden usar la Parcela SSCC, pero antes de ir deben **avisar** (idealmente por correo) que irán con su **núcleo familiar**. Cada integrante del núcleo familiar debe tener su propio perfil para llevar historial: cuántas veces ha ido y cuántas multas ha recibido. Cada usuario se registra para poder reservar la parcela mediante un calendario de disponibilidad, con una **forma de pago real**. La administración la lleva el dueño del proyecto hasta que el sistema quede estable; después se abre un portal de administración con usuarios y privilegios (aprobar reservas, registrar multas, ver estadísticas).

## Goals

- Permitir a los socios reservar la parcela en fecha(s) específicas.
- Aviso por correo al colegio/familia antes de cada visita.
- Perfil por integrante del núcleo familiar con historial de visitas y multas.
- Calendario de disponibilidad con reservas.
- Pago real integrado.
- Administración inicial por una sola persona (el dueño).
- Fase 2: portal de admin con roles, privilegios y estadísticas.

## Non-goals

- App móvil nativa (se usa web responsive; PWA opcional).
- Integración con sistemas existentes del colegio.
- Pagos en efectivo o fuera de línea.
- Multi-idioma (solo español por ahora).

## Anti-goals (qué haría que falle aunque "funcione")

- Reservas duplicadas o solapadas en las mismas fechas.
- Que un no-socio pueda reservar.
- Multas o visitas no registradas / historial perdido.
- Pagos que no se reflejan en el sistema.

## Constraints

- Plataforma web responsive (Next.js).
- Un solo administrador inicialmente.
- Pagos reales requieren pasarela externa (por definir: Mercado Pago, Flow, WebPay, etc.).
- Notificaciones por correo requieren proveedor SMTP/transaccional (por definir).
- Idioma español.

## Approaches

Se consideraron tres formas de construirlo:

1. **Next.js full-stack** (frontend + API en un solo proyecto, Prisma + PostgreSQL). Un solo codebase, despliegue simple, ecosistema maduro. **Elegida.**
2. **Backend separado + frontend SPA** (API en Node/NestJS + React/Vite). Más piezas que mantener, pero más flexible si después se quiere app móvil o varios clientes.
3. **BaaS (Supabase/Firebase) + frontend**. Lo más rápido para tener algo funcionando, pero con menos control y dependencia del proveedor; los pagos igual requieren integración propia.

**Elegida: 1.** Es un solo sistema con un admin y un frontend. Empezar aquí no bloquea migrar después: el backend de Next.js puede extraerse a una API independiente (opción 2) cuando haga falta, sin reescribir la lógica de negocio.

## Cómo se construye (decisiones tomadas)

- **Stack:** Next.js (App Router), TypeScript, Prisma, PostgreSQL, Tailwind, shadcn/ui.
- **Autenticación:** email + contraseña, verificación por correo, roles (socio, admin). Cualquier integrante del núcleo familiar puede registrarse y reservar.
- **Modelo de datos:** User, Family (núcleo familiar), FamilyMember, Reservation (por día, múltiples familias el mismo día), Visit, Fine, Payment, ExtraPerson (invitado extra con cargo), AddOnSpace (quincho, sala de eventos, sala cafetería con precios propios) y BookingAddOn.
- **Calendario:** vista de disponibilidad por día; sin límite de capacidad (parcela para ~30 familias, nunca llena).
- **Pagos:** el pago confirma la reserva; al confirmarse se genera un código QR (página validable) para validar el ingreso. Pasarela por definir (recomendado Mercado Pago para Chile).
- **Estados de reserva (decisión mía):** PENDIENTE_PAGO → CONFIRMADA (pagada, con QR) → COMPLETADA (pasó la fecha) o CANCELADA. Cancelación/reembolso queda como política a definir.
- **Correo:** proveedor transaccional (Resend/SendGrid) o SMTP.
- **Administración:** fase 1 panel simple protegido para el dueño; fase 2 roles/permisos y estadísticas.

## Reglas de negocio (precios) — por definir montos

- Reserva base por día para el núcleo familiar.
- Invitado extra (persona no perteneciente al núcleo familiar): cargo adicional.
- Uso de piscina por invitado extra: cargo adicional.
- Espacios arrendables con precio propio: quincho, sala de eventos, sala cafetería.
- Sala de eventos y sala cafetería: para una sola familia con X invitados (capacidad de invitados por definir).

## Propuestas de correo electrónico

1. **Confirmación de reserva** (inmediato al pagar): datos de la fecha, familia, espacios reservados, invitados extra, monto pagado, código QR para ingreso.
2. **Recordatorio previo a la visita** (1–2 días antes, requiere tareas programadas): recordatorio de fecha, QR, reglas de uso y multas.
3. **Aviso de multa** (al registrar una multa): motivo, monto, fecha, instrucciones de pago.

## Lo que queda para el builder

- Elegir pasarela de pago y proveedor de correo.
- Diseño visual exacto (mockups).
- Reglas de multas: montos, motivos, quién las aplica.
- Políticas de cancelación y reembolso.
- Despliegue (Vercel + base de datos gestionada).
- Definir capacidad de invitados por sala de eventos/cafetería y montos de todos los cargos.