# Diseño: Importación de núcleos familiares desde Excel

**Fecha:** 2026-11-05
**Proyecto:** Parcela SSCC (Next.js + Prisma + PostgreSQL/Neon)
**Estado:** Borrador para aprobación

## 1. Intención y por qué

El colegio entrega una lista (Excel) con los núcleos familiares de los socios:
RUT, nombres, apellidos, parentesco, curso, exalumno y (opcional) foto.
Hoy los socios deben crear su familia y agregar integrantes a mano, lo que es
lento y propenso a errores, y no aprovecha la validación del colegio.

Queremos que el **admin importe esa lista una vez**, y que cuando un socio se
registre (por correo o RUT) su núcleo se le asigne automáticamente, editable
después si corresponde.

## 2. Objetivos

- Importar cientos de núcleos desde un `.xlsx` con columnas fijas.
- Vincular automáticamente al titular (apoderado) y a los integrantes cuando
  se registren, por **correo** (prioridad) y luego por **RUT**.
- Evitar duplicados: un solo núcleo por familia, compartido entre integrantes.
- Permitir editar/eliminar integrantes después de la importación.
- Mostrar RUT, curso y condición de exalumno en la ficha familiar.

## 3. No-objetivos (fuera de alcance ahora)

- No guardar fotos (solo referencia en el Excel).
- No importar desde PDF/Word (solo Excel).
- No sincronización automática con el colegio (es carga manual por el admin).
- No portal de auto-servicio para que el socio corrija datos del colegio.

## 4. Restricciones

- Base de datos PostgreSQL (Neon); migraciones con Prisma.
- Solo rol ADMIN importa.
- Un socio puede tener a lo sumo un núcleo como titular (owner).
- Los integrantes vinculados ven el núcleo pero no son dueños.

## 5. Enfoque elegido (opción 1)

Importación por Excel + vinculación por correo/RUT.

### 5.1 Cambios de esquema (Prisma)

`Family`:
- `ownerId` pasa a ser **opcional** (`String?`, `@unique`) para permitir núcleos
  importados sin titular registrado aún.
- (opcional) `importedAt DateTime?` y `importBatch String?` para trazabilidad.

`FamilyMember`:
- `rut String?`
- `email String?` (para vincular antes de que exista User)
- `course String?`
- `exAlumno Boolean @default(false)`

`User` (registro):
- Agregar `rut String @unique` (obligatorio, para cruce con núcleos importados).

### 5.2 Plantilla Excel

Columnas (una fila por integrante; se agrupan por `id_nucleo`):

| id_nucleo | rut_titular | nombre_titular | apellido_paterno | apellido_materno | correo_titular | rut_integrante | nombre_integrante | parentesco | curso | exalumno |
|---|---|---|---|---|---|---|---|---|---|---|

- `id_nucleo`: identificador del grupo (ej. `NUC-001` o RUT del titular).
- Fila del titular: `rut_integrante = rut_titular`, `parentesco = titular`.
- Integrantes adicionales: una fila por persona con su RUT y parentesco.
- `exalumno`: `SI`/`NO`.
- Se incluye una fila de ejemplo con la familia Moncada.

### 5.3 Importación (admin)

- Pantalla `/admin/familias/importar` con:
  - Botón "Descargar plantilla".
  - Selector de archivo + botón "Importar".
  - Resumen: núcleos creados/actualizados, integrantes, errores por fila.
- Endpoint `POST /api/admin/families/import` (multipart/form-data).
  - Valida rol ADMIN.
  - Parsea con `exceljs`.
  - Agrupa filas por `id_nucleo`.
  - Upsert de `Family` por `id_nucleo` (guardado en un campo `importKey` o por RUT titular).
  - Upsert de `FamilyMember` por (familyId + rut) para evitar duplicados.
  - No crea usuarios (solo datos del núcleo).
- Endpoint `GET /api/admin/families/template` genera el `.xlsx` con ejemplo.

### 5.4 Vinculación al registrarse

El **RUT es obligatorio** al registrarse.

Modificar `/api/auth/register` (o donde se crea el User):
1. Validar y normalizar el RUT. Si ya existe un User o FamilyMember con ese RUT,
   rechazar con: *"Este RUT ya pertenece a un núcleo familiar. Si no es así,
   contacta al administrador."*
2. Crear el User con email y rut.
3. Buscar núcleo importado sin titular cuyo `email_titular` o `rut_titular`
   coincida → asignar `ownerId = user.id`.
4. Buscar `FamilyMember` sin `userId` cuyo `email` o `rut` coincida →
   asignar `userId = user.id`.
5. Si no hay coincidencia, el socio crea su núcleo manualmente como hoy.

El formulario de registro agrega campo obligatorio "RUT" (solo dígitos y guión).

### 5.5 Vinculación al iniciar sesión (respaldo)

Si por alguna razón no se vinculó al registrarse (ej. import posterior),
al hacer login se ejecuta una vinculación perezosa (lazy) equivalente,
para no depender de orden de operaciones.

### 5.6 Visualización y permisos

- `GET /api/families` (del socio): devuelve el núcleo donde `ownerId = user.id`
  **o** donde existe un `FamilyMember.userId = user.id`. Si hay varios, el del
  titular tiene prioridad.
- Editar/eliminar integrantes: solo el titular (owner) o un ADMIN.
- Un integrante vinculado puede ver el núcleo y sus propios datos.

### 5.7 Edición/eliminación de integrantes (API)

Agregar:
- `PATCH /api/families/[id]/members/[memberId]` — editar nombre, parentesco,
  RUT, curso, exalumno, email.
- `DELETE /api/families/[id]/members/[memberId]` — eliminar.
- Validar permisos (owner o admin).

### 5.8 Pantalla de familia

- Mostrar por integrante: nombre, parentesco, RUT, curso, exalumno (badge),
  correo vinculado.
- Botones editar/eliminar (solo titular/admin).
- Si el núcleo fue importado y aún no tiene titular registrado, mostrar
  aviso: "Núcleo importado del colegio. Regístrate con tu correo/RUT para
  tomarlo."

## 6. Alternativas consideradas

- **B (CSV pegado):** descartada por fragilidad con acentos y escala.
- **C (manual):** descartada por volumen.
- Guardar fotos: descartado por ahora (no-objetivo); se puede agregar luego
  con un campo `photoUrl` y almacenamiento (S3/Vercel Blob).

## 7. Riesgos y mitigaciones

- **Duplicados por id_nucleo inconsistente:** validar y reportar filas con
  `id_nucleo` vacío o duplicado en la importación.
- **RUT con formato variable:** normalizar (quitar puntos, mayúsculas en K).
- **Titular ya tiene núcleo manual:** al vincular, no sobrescribir; fusionar
  o pedir confirmación. Por defecto: si el usuario ya tiene núcleo, se
  vincula el importado como "referencia" pero no borra el manual (admin
  decide).
- **Integrante se registra antes del titular:** se vincula al FamilyMember;
  cuando el titular se registre, se asigna ownerId. Mientras tanto, los
  integrantes vinculados pueden ver el núcleo en modo solo lectura.

## 8. Lo que queda al constructor (decisiones menores)

- Librería Excel: `exceljs` (MIT).
- Normalización de RUT: helper `normalizeRut`.
- Formato de `id_nucleo` sugerido: `NUC-001` o RUT del titular sin DV.
- Migración de datos existentes: las familias creadas manualmente siguen
  funcionando (ownerId no null).

## 9. Aprobación

Pendiente de revisión del usuario. Tras aprobar, se invoca
`superpowers:writing-plans` para generar el plan de implementación.
