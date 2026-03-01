# Expensly — Backend

API REST construida con **NestJS 11** y **Prisma 6** sobre PostgreSQL. Implementa la lógica de negocio, autenticación, procesamiento de facturas con IA y la capa de seguridad multi-tenant de Expensly.

---

## Decisiones de arquitectura

### ¿Por qué NestJS?

NestJS proporciona inyección de dependencias nativa, módulos aislados y decoradores declarativos que mapean directamente al dominio de la aplicación. Su estructura obliga a mantener la separación entre controladores (transporte HTTP), servicios (lógica de negocio) y repositorios (acceso a datos), lo que facilita el testing y el mantenimiento.

### Patrón Repository

Cada módulo de dominio tiene su propio repositorio que encapsula todas las queries de Prisma. Los servicios nunca acceden al `PrismaService` directamente — siempre a través del repositorio correspondiente.

**¿Por qué?** Esto permite:
1. Mockar el repositorio en tests de servicio sin levantar base de datos
2. Cambiar el ORM sin tocar la lógica de negocio
3. Centralizar los filtros de `organizacion_id` en un único lugar

### Estructura de módulos

```
src/
├── infrastructure/
│   ├── mail/          # MailModule — Nodemailer + Handlebars para emails transaccionales
│   ├── ocr/           # AzureOcrService — integración con Azure Document Intelligence
│   ├── storage/       # Cloudinary — subida y gestión de imágenes de facturas
│   └── tasks/         # Tareas programadas (limpieza de tokens expirados, etc.)
├── modules/
│   ├── auth/          # Autenticación: login, registro, reset password, JWT strategy
│   └── registro-gastos/  # Facturas, categorías, usuarios, exportación
└── prisma/
    ├── prisma.module.ts
    └── prisma.service.ts
```

La carpeta `infrastructure/` contiene adaptadores de servicios externos (Azure, Cloudinary, SMTP). Están aislados del dominio para poder sustituirlos sin afectar la lógica de negocio.

---

## Módulos de dominio

### `auth`

Gestiona el ciclo completo de autenticación:

- **Registro**: crea la organización y el primer usuario SUPERADMIN en una transacción atómica. Si alguno de los dos falla, no se persiste ninguno.
- **Login**: verifica credenciales, comprueba que el usuario esté activo y que la sesión no haya sido revocada antes de emitir el JWT.
- **Reset de contraseña**: genera un token UUID4, lo almacena hasheado en la base de datos con una ventana de expiración de 1 hora. El token se invalida **tras su primer uso**, independientemente de si la ventana sigue abierta.
- **JWT Strategy**: `PassportStrategy` que valida la firma y extrae `userId`, `organizacionId`, `rol` del payload.

**¿Por qué el `organizacion_id` va en el JWT?** Para que cada request lleve el contexto de tenant sin necesidad de consultar la base de datos para obtenerlo. El guard extrae el `organizacion_id` del token y lo inyecta en todos los queries — nunca se confía en el body del request para este valor.

### `registro-gastos`

Módulo central de la aplicación. Contiene:

#### Facturas
- **Procesamiento dual (QR + OCR)**:
  1. El cliente envía las imágenes junto con el QR decodificado en el browser (si lo encontró)
  2. El backend **verifica el QR de forma independiente** — si el cliente dijo que encontró QR, el backend lo confirma. Si coinciden, consulta la DGI directamente mediante web scraping (cheerio) sin costo de Azure
  3. Si no hay QR o la verificación falla, invoca Azure Document Intelligence
  4. Esta arquitectura evita que un cliente malicioso envíe QR falsos que produzcan datos incorrectos

- **Subida de imágenes**: múltiples imágenes por factura, subidas a Cloudinary con metadatos de orden para preservar la secuencia en el visor del frontend. Las imágenes se almacenan en la tabla `factura_imagenes` con `orden` para el carrusel.

- **CRUD de facturas**: todos los endpoints filtran por `organizacion_id` del JWT antes de cualquier operación. Un usuario de la organización A no puede acceder a facturas de la organización B aunque envíe un ID válido en la URL.

- **Aprobación/rechazo**: actualiza el estado de la factura con registro de `motivo_rechazo` y log de auditoría.

- **Exportación Excel**: genera un archivo `.xlsx` en memoria con todos los campos de las facturas filtradas, usando la librería `xlsx` sin dependencias nativas.

#### Usuarios
- **CRUD completo** con protecciones:
  - Un SUPERADMIN no puede eliminarse a sí mismo
  - Un SUPERADMIN no puede ser eliminado ni degradado por un CONTADOR
  - Al eliminar un usuario, sus facturas se actualizan a `usuario_id = null` mediante `onDelete: SetNull` en Prisma — las facturas no se borran, solo quedan huérfanas
- **Invitaciones por email**: el SUPERADMIN invita a un nuevo usuario; el sistema crea la cuenta con una contraseña temporal y envía un email con el enlace de acceso

#### Categorías
- Categorías de gasto propias de cada organización (`UNIQUE(organizacion_id, nombre)`)
- Creadas automáticamente durante el onboarding con valores por defecto. Estos podran ser modificados posteriormente por el SUPERADMIN.

---

## Seguridad

### Guards

```typescript
// Protección de endpoint por rol
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles('SUPERADMIN')
@Delete(':id')
deleteUser(@Param('id') id: string, @CurrentUser() user: JwtPayload) { ... }
```

- `JwtAuthGuard`: verifica firma y expiración del token
- `RoleGuard`: compara el rol del payload con los roles requeridos en el decorator `@Roles`
- `@CurrentUser()`: decorator personalizado que extrae el payload ya verificado del request

### Aislamiento multi-tenant

```typescript
// En TODOS los repositorios — ejemplo en facturas
async findAll(organizacionId: string, filters: FilterDto) {
  return this.prisma.facturas.findMany({
    where: {
      organizacion_id: organizacionId,  // ← Siempre del JWT, nunca del body
      ...buildFilters(filters),
    }
  });
}
```

Este patrón se repite en todos los repositorios: categorías, usuarios, logs, tags. No existe ningún endpoint que devuelva datos sin filtrar por `organizacion_id`.

---

## Procesamiento OCR con Azure Document Intelligence

```typescript
// infrastructure/ocr/azure-ocr.service.ts
const client = DocumentAnalysisClient(endpoint, credential);
const poller = await client.beginAnalyzeDocument('prebuilt-invoice', imageStream);
const result = await poller.pollUntilDone();
```

Se usa el modelo `prebuilt-invoice` de Azure, entrenado específicamente para facturas. Extrae: número de factura, fecha, nombre del proveedor, RUC, montos (subtotal, ITBMS, total).

**¿Por qué Azure y no Tesseract?** Tesseract requiere imágenes de alta calidad y procesamiento adicional para facturas. Azure Document Intelligence maneja fotografías tomadas con teléfono, imágenes inclinadas y baja resolución con mucha mayor precisión, lo que reduce las correcciones manuales del usuario.

---

## Base de datos y migraciones

### Prisma

```bash
# Crear nueva migración
npx prisma migrate dev --name nombre_descriptivo

# Aplicar migraciones en producción
npx prisma migrate deploy

# Generar cliente Prisma (incluye fix post-generación)
npm run prisma:generate
```

#### Script `fix-generated.js`

Prisma v6 movió `Decimal` y `JsonValue` fuera del namespace `Prisma`. Esto rompe el código generado por `prisma-class-validator-generator`. El script `prisma/fix-generated.js` parcheа los archivos generados automáticamente después de cada `prisma generate`, reemplazando las referencias antiguas por los tipos correctos.

**¿Por qué no cambiar el generador?** `prisma-class-validator-generator` no tiene una versión compatible con Prisma v6 al momento del MVP. El script es una solución temporal documentada hasta que el generador actualice su soporte.

### Variables de entorno requeridas

```env
# Base de datos
DATABASE_URL="postgresql://user:password@host:5432/expensly"

# JWT
JWT_SECRET="secreto-muy-largo-y-aleatorio"
JWT_EXPIRES_IN="7d"

# Azure Document Intelligence
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT="https://xxx.cognitiveservices.azure.com/"
AZURE_DOCUMENT_INTELLIGENCE_KEY="xxx"

# Cloudinary
CLOUDINARY_CLOUD_NAME="xxx"
CLOUDINARY_API_KEY="xxx"
CLOUDINARY_API_SECRET="xxx"

# SMTP (Nodemailer)
MAIL_HOST="smtp.gmail.com"
MAIL_PORT=587
MAIL_USER="correo@gmail.com"
MAIL_PASS="app-password"
MAIL_FROM="Expensly <correo@gmail.com>"

# URL del frontend (para links en emails)
FRONTEND_URL="http://localhost:4200"
```

---

## Comandos disponibles

```bash
# Instalar dependencias
npm install

# Desarrollo con hot-reload
npm run start:dev

# Desarrollo con debug
npm run start:debug

# Build de producción
npm run build

# Producción (requiere build previo)
npm run start:prod

# Linter
npm run lint

# Generar cliente Prisma (con fix automático)
npm run prisma:generate

# Tests unitarios
npm test

# Tests unitarios en modo watch
npm run test:watch

# Cobertura de tests
npm run test:cov

# Tests E2E
npm run test:e2e
```

---

## Colecciones de Prisma y herramientas de desarrollo

```bash
# Abrir Prisma Studio (interfaz visual de la BD)
npx prisma studio

# Ver el estado de las migraciones
npx prisma migrate status

# Resetear la base de datos (¡destructivo!)
npx prisma migrate reset
```

---

## Consideraciones de producción

1. **Variables de entorno**: nunca commitear el archivo `.env`. Usar variables de entorno del proveedor de hosting.
2. **Migraciones**: ejecutar `prisma migrate deploy` (no `dev`) en producción — no modifica el esquema interactivamente.
3. **JWT Secret**: usar un valor de al menos 256 bits generado aleatoriamente.
4. **Cloudinary**: configurar carpetas separadas por entorno (`expensly/dev/`, `expensly/prod/`).
5. **Rate limiting**: pendiente de implementar en endpoints sensibles (login, reset-password) para producción.

---

## Requisitos

- Node.js ≥ 20
- npm ≥ 10
- PostgreSQL ≥ 15
- Cuenta activa en Azure Cognitive Services (Document Intelligence)
- Cuenta activa en Cloudinary
- Cuenta SMTP (Gmail App Password o equivalente)
