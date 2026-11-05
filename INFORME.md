# Informe Detallado — Sistema de Reservas Parcela SSCC

**Fecha:** 05 de noviembre de 2026
**Proyecto:** Parcela SSCC (Colegio SSCC)
**Estado:** Plan 1 (MVP) + Plan 2 (Portal Admin) + Plan 3 (Notificaciones) implementados

---

## 1. Resumen ejecutivo

Sistema web de reservas para la parcela del Colegio SSCC. Permite a las familias socias reservar la parcela por día completo, agregar invitados extra, arrendar espacios (quincho, casino, cafetería) y pagar online. Incluye portal de administración, validación de acceso por QR, multas, importación masiva de núcleos familiares desde Excel y notificaciones por correo.

---

## 2. Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend/Backend | Next.js 16.4.5 (App Router, Turbopack) + TypeScript |
| Estilos | Tailwind CSS (modo oscuro adaptativo al SO) |
| ORM | Prisma 7 |
| Base de datos | PostgreSQL en Neon (cloud) |
| Autenticación | NextAuth v5 (JWT, Credentials) |
| Pagos | Mercado Pago (integrado, pendiente configurar credenciales) |
| Correos | Nodemailer (Gmail SMTP) / Resend (fallback) |
| QR | qrcode (generación) + validación web |
| Excel | exceljs (importación/exportación) |
| Hosting | Vercel |
| Repositorio | GitHub: https://github.com/xmarmijo/Parcela-SSCC.git (branch main) |

---

## 3. Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel (Hosting)                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Next.js App (App Router)                 │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │  │
│  │  │  Páginas    │  │  API Routes │  │  Middleware  │  │  │
│  │  │  (React)    │  │  (Node.js)  │  │  (Auth)      │  │  │
│  │  └─────────────┘  └─────────────┘  └──────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                                    │
         ▼                                    ▼
┌─────────────────┐              ┌─────────────────────┐
│  Neon PostgreSQL │              │  Servicios externos │
│  (Base de datos) │              │  - Mercado Pago     │
└─────────────────┘              │  - Gmail SMTP       │
                                 │  - Vercel Cron      │
                                 └─────────────────────┘
```

### Flujo de datos
```
Usuario → Next.js (Vercel) → Prisma → Neon PostgreSQL
                ↓
         Servicios externos (MP, Gmail, Cron)
```

---

## 4. Roles y permisos

| Rol | Acceso | Descripción |
|-----|--------|-------------|
| SOCIO | Páginas de socio, reservas, familia | Usuario estándar (familia socia) |
| ADMIN | Todo + /admin/* | Administrador del sistema |
| GUARDIA | /validar/* (público) | Validación de QR en entrada |

- El middleware protege `/admin/*` (solo ADMIN).
- Rutas de socio (`/reservar`, `/reservas`, `/mis-reservas`, `/familia`, `/perfil`) requieren autenticación.

---

## 5. Mapa de páginas (URLs)

### Públicas
| URL | Descripción |
|-----|-------------|
| `/` | Portada con accesos a login, registro y reserva |
| `/login` | Iniciar sesión (correo o RUT) |
| `/register` | Crear cuenta de socio (RUT obligatorio) |
| `/validar/[token]` | Validación de QR (guardia) |

### Socio (requiere login)
| URL | Descripción |
|-----|-------------|
| `/reservar` | Formulario de reserva (fecha, espacios, invitados) |
| `/reservas/[id]` | Detalle de reserva, pago, QR, comprobantes, editar invitados |
| `/mis-reservas` | Historial de reservas |
| `/familia` | Mi familia: crear núcleo, agregar/editar/eliminar integrantes, multas |
| `/perfil` | Mi perfil: datos de cuenta, cambiar contraseña |

### Admin (requiere rol ADMIN)
| URL | Descripción |
|-----|-------------|
| `/admin` | Dashboard: tarjetas, gráficos (estados, días, familias), últimas reservas |
| `/admin/familias` | Listado de familias con búsqueda y paginación |
| `/admin/familias/[id]` | Detalle: integrantes, reservas, multas, cambio de rol |
| `/admin/familias/importar` | Importar núcleos desde Excel |
| `/admin/integrantes` | Integrantes sin cuenta de acceso |
| `/admin/multas` | Emitir y listar multas, marcar pagadas |
| `/admin/reservas` | Listado de reservas (filtro por fecha/RUT/estado), cancelar, confirmar pago |
| `/admin/usuarios` | Crear/editar/eliminar usuarios, resetear clave |
| `/admin/espacios` | Editar precio y capacidad de espacios |
| `/admin/bloqueos` | Bloquear/desbloquear fechas |
| `/admin/calendario` | Calendario visual con reservas por día |
| `/admin/auditoria` | Log de acciones administrativas |
| `/admin/notificaciones` | Enviar recordatorios y resumen semanal |
| `/admin/configuracion` | Correo (Gmail), datos bancarios, motivos de multa |
| `/admin/espera` | Lista de espera |

---

## 6. API Endpoints

### Públicos / Auth
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/register` | Crear cuenta (email, password, rut) |
| POST | `/api/auth/[...nextauth]` | Login (NextAuth) |
| GET | `/api/qr/[token]` | Obtener QR (imagen o JSON) |
| GET | `/validar/[token]` | Validar QR (página) |

### Socio
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET/POST | `/api/families` | Ver/crear familia |
| GET/POST | `/api/families/[id]/members` | Listar/agregar integrante |
| PATCH/DELETE | `/api/families/[id]/members/[memberId]` | Editar/eliminar integrante |
| POST | `/api/families/link` | Vinculación perezosa |
| GET/POST | `/api/reservations` | Listar/crear reserva |
| GET/PATCH/DELETE | `/api/reservations/[id]` | Ver/editar/cancelar reserva |
| GET | `/api/addon-spaces` | Listar espacios (con disponibilidad) |
| GET | `/api/fines` | Multas de mi familia |
| GET/PATCH | `/api/profile` | Mi perfil / cambiar contraseña |
| POST | `/api/payments/create-preference` | Crear preferencia MP |
| POST | `/api/payments/webhook` | Webhook MP (confirmación) |

### Admin
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Estadísticas del dashboard |
| GET | `/api/admin/families` | Listado de familias (búsqueda, paginación) |
| GET/PATCH | `/api/admin/families/[id]` | Detalle/editar familia |
| POST | `/api/admin/families/import` | Importar núcleos desde Excel |
| GET | `/api/admin/families/template` | Descargar plantilla Excel |
| GET/POST | `/api/admin/fines` | Listar/crear multa |
| PATCH | `/api/admin/fines/[id]` | Marcar multa pagada |
| GET/PATCH | `/api/admin/reservations` | Listar/cancelar/confirmar reserva |
| GET/PATCH | `/api/admin/spaces` | Listar/editar espacios |
| GET/POST | `/api/admin/users` | Listar/crear usuarios |
| PATCH/DELETE | `/api/admin/users/[id]` | Editar/eliminar usuario |
| GET/POST/DELETE | `/api/admin/blocked-dates` | Fechas bloqueadas |
| GET | `/api/admin/calendar` | Reservas por día (calendario) |
| GET | `/api/admin/audit` | Log de auditoría |
| GET/POST | `/api/admin/members` | Integrantes (sin cuenta) |
| GET/PATCH | `/api/admin/settings` | Configuración (correo, banco, multas) |
| GET | `/api/admin/export` | Exportar Excel (4 hojas) |
| POST | `/api/admin/notify/reminders` | Enviar recordatorios |
| POST | `/api/admin/notify/weekly` | Enviar resumen semanal |

### Cron (Vercel)
| Endpoint | Schedule | Descripción |
|----------|----------|-------------|
| `/api/cron/reminders` | Diario 12:00 UTC | Recordatorios de reserva |
| `/api/cron/weekly` | Lunes 12:00 UTC | Resumen semanal a admins |

---

## 7. Modelo de datos (Prisma)

### Entidades principales
```
User (id, email, rut, passwordHash, role, createdAt)
  └── Family (id, code, name, ownerId, importKey, importedAt)
        ├── FamilyMember (id, fullName, relation, rut, email, course, exAlumno, userId)
        ├── Reservation (id, date, status, totalAmount, familyId)
        │     ├── ExtraPerson (id, fullName, rut, isSocio, usesPool)
        │     ├── ReservationAddOn (quantity, addOnSpaceId)
        │     ├── Payment (provider, method, amount, status, paidAt)
        │     ├── QrToken (token, usedAt)
        │     └── Visit (checkedInAt, checkedInBy)
        └── Fine (reason, amount, paidAt, familyMemberId, issuedById)
AddOnSpace (name, pricePerUnit, capacityGuests, dailyLimit)
BlockedDate (date, reason)
WaitlistEntry (familyId, date)
AuditLog (action, entityType, entityId, userId, details)
AppSetting (key, value)
```

### Estados de reserva
```
PENDIENTE_PAGO → CONFIRMADA (tras pago) → COMPLETADA
                                    ↘ CANCELADA
```

---

## 8. Flujos principales

### 8.1 Registro de usuario
```mermaid
flowchart TD
    A[Usuario ingresa email, RUT, contraseña] --> B{¿Email o RUT ya existen?}
    B -->|Sí| C[Error: ya registrado]
    B -->|No| D[Crear User (rol SOCIO)]
    D --> E{¿RUT coincide con integrante importado?}
    E -->|Sí| F[Vincular FamilyMember.userId y Family.ownerId]
    E -->|No| G[Usuario crea familia manualmente]
    F --> H[Login automático]
    G --> H
```

### 8.2 Reserva y pago
```mermaid
flowchart TD
    A[Seleccionar fecha] --> B{¿Fecha bloqueada?}
    B -->|Sí| C[Error: parcela cerrada]
    B -->|No| D[Agregar espacios opcionales]
    D --> E[Agregar invitados extra (RUT validado)]
    E --> F{¿Tiene multas pendientes?}
    F -->|Sí| G[Error: regularizar multas]
    F -->|No| H[Calcular total en servidor]
    H --> I[Crear reserva PENDIENTE_PAGO]
    I --> J[Redirigir a detalle]
    J --> K[Pagar (Mercado Pago o manual)]
    K --> L[Webhook confirma pago]
    L --> M[Estado → CONFIRMADA + QR generado]
    M --> N[Correo de confirmación + QR]
```

### 8.3 Validación de acceso (guardia)
```mermaid
flowchart TD
    A[Guardia escanea QR con celular] --> B[Abrir /validar/token]
    B --> C{¿Token válido?}
    C -->|No| D[QR Inválido]
    C -->|Sí| E{¿Ya usado?}
    E -->|Sí| F[QR Ya Utilizado + hora primer uso]
    E -->|No| G[Marcar usedAt + crear Visit]
    G --> H[Mostrar: familia, fecha, total, núcleo con RUTs, invitados con RUTs]
    H --> I[Guardia verifica personas]
```

### 8.4 Importación de núcleos (admin)
```mermaid
flowchart TD
    A[Admin descarga plantilla Excel] --> B[Completa con datos del colegio]
    B --> C[Sube el archivo]
    C --> D[Parsear y agrupar por id_nucleo]
    D --> E[Upsert Family + FamilyMember por RUT]
    E --> F[Resumen: creados/actualizados/errores]
    F --> G[Socio se registra → auto-vinculación]
```

---

## 9. Credenciales y configuración

### Base de datos (Neon PostgreSQL)
```
URL: postgresql://neondb_owner:npg_fPTuFQ4eXz8Z@ep-crimson-king-b6ss580t-pooler.c-2.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### Vercel (variables de entorno)
| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | (URL de Neon arriba) |
| `NEXTAUTH_SECRET` | `wJ8kQ2mZ7pR4tY9vX1cN6bL3sH5dF0gA` |
| `NEXTAUTH_URL` | `https://parcelasscc.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | `https://parcelasscc.vercel.app` |
| `MERCADOPAGO_ACCESS_TOKEN` | *(pendiente — token TEST-...)* |
| `GMAIL_USER` | *(pendiente — correo Gmail)* |
| `GMAIL_APP_PASSWORD` | *(pendiente — 16 caracteres)* |
| `CRON_SECRET` | *(pendiente — texto aleatorio)* |
| `EMAIL_FROM` | *(opcional)* |

### Cuentas de prueba
| Rol | Email | Contraseña |
|-----|-------|-----------|
| ADMIN | miguel.armijo.n@gmail.com | ParcelaSSCC2026! |
| SOCIO (15 familias) | pedro1@test.cl ... jorge15@test.cl | Parcela2026! |

### Repositorio
- URL: https://github.com/xmarmijo/Parcela-SSCC.git
- Branch: main
- Último commit: (ver git log)

### Dominios
- Principal: https://parcelasscc.vercel.app
- Secundario: https://parcela-sscc-31kz.vercel.app (redirige al principal)

---

## 10. Instrucciones de despliegue

1. **Código**: push a `main` en GitHub → Vercel despliega automáticamente.
2. **Base de datos**: las migraciones se aplican con `npx prisma migrate deploy` (o `prisma db push` en dev).
3. **Variables de entorno**: configurar en Vercel → Settings → Environment Variables.
4. **Cron jobs**: configurados en `vercel.json` (recordatorios diarios, resumen semanal los lunes).

---

## 11. Guía de uso paso a paso (para entrega)

### 11.1 Acceso inicial
- **URL del sistema:** https://parcelasscc.vercel.app
- **Cuenta admin:** correo `miguel.armijo.n@gmail.com` / contraseña `ParcelaSSCC2026!`
- **Cuentas de prueba (socios):** `pedro1@test.cl` ... `jorge15@test.cl` / contraseña `Parcela2026!`

### 11.2 Flujo del socio (reservar)
1. Ir a https://parcelasscc.vercel.app/login
2. Ingresar correo (o RUT) + contraseña → clic "Ingresar".
3. Ir a "Mi familia" (https://parcelasscc.vercel.app/familia):
   - Si no tiene familia: escribir nombre (ej. "Familia Armijo") → "Crear familia".
   - Agregar integrantes: nombre, RUT (obligatorio), parentesco, correo (opcional), contraseña (opcional).
4. Ir a "Reservar" (https://parcelasscc.vercel.app/reservar):
   - Seleccionar fecha.
   - (Opcional) Seleccionar espacios arrendables (quincho, casino, cafetería).
   - (Opcional) Agregar invitados extra (nombre + RUT; los socios no pagan).
   - Clic "Reservar y pagar".
5. En el detalle de la reserva (https://parcelasscc.vercel.app/reservas/[id]):
   - Ver total y estado "Pendiente de pago".
   - Clic "Pagar ahora" → redirige a Mercado Pago (requiere configuración).
   - Al pagar, el estado cambia a "Confirmada" y se genera el QR.
6. Descargar/imprimir el QR ("Descargar QR" / "Imprimir comprobante").
7. El día de la visita, el guardia escanea el QR → https://parcelasscc.vercel.app/validar/[token].

### 11.3 Flujo del guardia (validar acceso)
1. El guardia abre su celular y escanea el QR del socio (o abre el link del QR).
2. Se abre https://parcelasscc.vercel.app/validar/[token].
3. La página muestra:
   - "¡Pase Validado Exitosamente!" (verde) si es la primera vez.
   - "Código QR Ya Utilizado" (ámbar) si ya se usó, con la hora del primer uso.
   - "Código QR Inválido" (rojo) si el token no existe.
4. Se muestra: familia, fecha de visita, total pagado, núcleo familiar (con RUTs), invitados (con RUTs y etiquetas).
5. El guardia verifica que las personas que entran estén en la lista.
6. Clic "Finalizar control".

### 11.4 Flujo del admin (portal)
1. Ingresar con cuenta admin → el menú muestra "Admin".
2. Ir a `/admin` (Dashboard): tarjetas, gráficos, últimas reservas.
3. **Familias** (`/admin/familias`): buscar por nombre/RUT/correo, ver detalle, editar rol del titular, ver integrantes/multas/reservas.
4. **Importar núcleos** (`/admin/familias/importar`): descargar plantilla Excel, completar, subir.
5. **Integrantes sin cuenta** (`/admin/integrantes`): ver quiénes no tienen login, link a la familia.
6. **Multas** (`/admin/multas`): emitir multa (familia, motivo, monto), marcar pagada.
7. **Reservas** (`/admin/reservas`): filtrar por fecha/RUT/estado, ver detalle, cancelar, confirmar pago (transferencia/efectivo).
8. **Usuarios** (`/admin/usuarios`): crear guardia/admin/socio, resetear contraseña, cambiar rol, eliminar.
9. **Espacios** (`/admin/espacios`): editar precio y capacidad de quincho/casino/cafetería.
10. **Bloqueos** (`/admin/bloqueos`): bloquear fechas por mantenimiento.
11. **Calendario** (`/admin/calendario`): ver ocupación por día, clic en un día para ver las reservas.
12. **Auditoría** (`/admin/auditoria`): log de acciones.
13. **Notificaciones** (`/admin/notificaciones`): enviar recordatorios y resumen semanal.
14. **Configuración** (`/admin/configuracion`): Gmail, datos bancarios, motivos de multa.
15. **Exportar Excel** (`/api/admin/export`): descarga Excel con 4 hojas (Familias, Integrantes, Reservas, Multas).

### 11.5 Configuración de Gmail (correos)
1. Activar verificación en 2 pasos en la cuenta Google.
2. Ir a https://myaccount.google.com/apppasswords → crear contraseña para "Parcela SSCC".
3. En el portal admin → "Configuración" → ingresar correo Gmail + App Password → Guardar.
4. Probar en "Notificaciones" → "Enviar resumen semanal".

### 11.6 Configuración de Mercado Pago (pagos online)
1. Crear app en https://www.mercadopago.cl/developers/panel/app.
2. Copiar credencial de TEST (access token que empieza con TEST-).
3. En Vercel → Settings → Environment Variables → agregar `MERCADOPAGO_ACCESS_TOKEN`.
4. Redesplegar. Probar pago con tarjeta de prueba de MP.

### 11.7 Configuración de cron jobs (Vercel)
1. En Vercel → Settings → Environment Variables → agregar `CRON_SECRET` (texto aleatorio).
2. Los cron jobs (recordatorios diarios, resumen semanal) se ejecutan automáticamente.
3. Si el plan de Vercel no soporta cron, usar botones manuales en `/admin/notificaciones`.

---

## 12. Pendientes

| # | Tarea | Estado |
|---|-------|--------|
| 16 | PWA (instalar en celular del guardia) | Pendiente |
| 18 | Mercado Pago real (configurar token TEST/PROD) | Pendiente |
| — | Configurar Gmail (App Password) | Pendiente |
| — | Configurar CRON_SECRET en Vercel | Pendiente |

---

## 12. Notas técnicas

- **Prisma client**: se genera en `src/generated/prisma`; importar desde `@/generated/prisma/client`.
- **Shell**: PowerShell; usar `cmd /c` con `cd /d` para npm/prisma.
- **Tests**: `npm test` (67 tests, todos pasando) + `npm run test:e2e` (Playwright, 5 tests).
- **Typecheck**: `npx tsc --noEmit`.
- **Build**: `npm run build`.
- **Modo oscuro**: se adapta automáticamente al SO (prefers-color-scheme). No hay toggle manual.
- **QR**: se genera al confirmar el pago (Mercado Pago webhook o confirmación manual en admin).
- **RUT**: se normaliza (sin puntos, K mayúscula) en todos los flujos.
