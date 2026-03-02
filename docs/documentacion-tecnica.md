DOCUMENTACIÓN TÉCNICA — EXPENSLY
Versión MVP 1.0.0 | 1 de marzo de 2026 | Clasificación: Interna==---

## TABLA DE CONTENIDOS

1. [Visión General del Producto](#1-visión-general-del-producto)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Diseño de la Base de Datos](#3-diseño-de-la-base-de-datos)
4. [Backend — NestJS](#4-backend--nestjs)
   - 4.1 [Estructura de Módulos](#41-estructura-de-módulos)
   - 4.2 [Módulo de Autenticación (`auth`)](#42-módulo-de-autenticación-auth)
   - 4.3 [Módulo de Registro de Gastos (`registro-gastos`)](#43-módulo-de-registro-de-gastos-registro-gastos)
   - 4.4 [Infraestructura de Servicios Externos](#44-infraestructura-de-servicios-externos)
   - 4.5 [Referencia de API REST](#45-referencia-de-api-rest)
5. [Frontend — Angular](#5-frontend--angular)
   - 5.1 [Estructura de la Aplicación](#51-estructura-de-la-aplicación)
   - 5.2 [Sistema de Rutas y Lazy Loading](#52-sistema-de-rutas-y-lazy-loading)
   - 5.3 [Módulo de Autenticación](#53-módulo-de-autenticación)
   - 5.4 [Módulo de Registro de Facturas](#54-módulo-de-registro-de-facturas)
   - 5.5 [Módulo de Administración](#55-módulo-de-administración)
   - 5.6 [Core — Guards, Interceptores y Servicios](#56-core--guards-interceptores-y-servicios)
   - 5.7 [Componentes Compartidos (Shared)](#57-componentes-compartidos-shared)
6. [Modelo de Seguridad](#6-modelo-de-seguridad)
7. [Flujos de Datos Críticos](#7-flujos-de-datos-críticos)
8. [Integraciones con Servicios Externos](#8-integraciones-con-servicios-externos)
9. [Variables de Entorno y Configuración](#9-variables-de-entorno-y-configuración)
10. [Guía de Desarrollo Local](#10-guía-de-desarrollo-local)

---

## 1. VISIÓN GENERAL DEL PRODUCTO

Expensly es una plataforma SaaS **multi-tenant** de gestión empresarial de gastos, orientada al mercado panameño. Su objetivo central es digitalizar y automatizar el ciclo completo de registro, validación y auditoría de facturas dentro de una organización.

### Problema que resuelve

Las empresas panameñas manejan sus comprobantes fiscales de forma manual: los empleados conservan tickets físicos, los digitizan a mano en hojas de cálculo y los administradores los revisan sin visibilidad centralizada. Este proceso es propenso a errores, lento y difícil de auditar.

### Solución

Expensly permite que un empleado fotografíe una factura desde cualquier dispositivo. El sistema extrae automáticamente todos los datos fiscales relevantes (proveedor, RUC, DV, fecha, montos, ITBMS) mediante reconocimiento de códigos QR de la DGI o mediante Inteligencia Artificial (Azure Document Intelligence). El administrador o contador audita, aprueba o rechaza las facturas desde un panel centralizado con filtros, paginación y exportación a Excel.

### Modelo multi-tenant

Una sola instancia del sistema sirve a múltiples organizaciones simultáneamente. El aislamiento de datos es **estructural**: cada entidad en la base de datos lleva un campo `organizacion_id`, y todos los repositorios del backend exigen este campo extraído del JWT. Un usuario de una organización es físicamente incapaz de ver datos de otra, independientemente de cómo construya su petición.

---

## 2. ARQUITECTURA DEL SISTEMA

### Diagrama de capas

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENTE (Browser)                     │
│          Angular 19 | TypeScript | Standalone Components     │
│    zxing-wasm (QR decode en WebAssembly, sin costo de red)   │
└────────────────────────────┬─────────────────────────────────┘
                             │  HTTPS / REST JSON
┌────────────────────────────▼─────────────────────────────────┐
│                     BACKEND (NestJS 11)                      │
│   JWT Auth | Role Guards | Validation Pipes | Repositories   │
│       Módulo Auth     |     Módulo Registro-Gastos           │
│       PrismaService   |     Infraestructura (OCR, Storage)   │
└──────┬───────────────────┬──────────────────┬────────────────┘
       │                   │                  │
       ▼                   ▼                  ▼
 PostgreSQL          Cloudinary         Azure Document
 (Supabase)           (CDN imgs)        Intelligence (OCR)
                                              │
                                        DGI (scraping)
                                         SMTP (correos)
```

### Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | Angular | 19.2 |
| Lenguaje frontend | TypeScript | 5.7 |
| Backend | NestJS | 11.0 |
| Lenguaje backend | TypeScript | 5.7 |
| ORM | Prisma | 6.x |
| Base de datos | PostgreSQL | 15+ |
| Autenticación | JWT + Bcrypt | — |
| Almacenamiento de imágenes | Cloudinary CDN | — |
| OCR | Azure Document Intelligence | REST API v1.0 |
| Decodificación QR | zxing-wasm (WebAssembly) | — |
| Correos transaccionales | Nodemailer + SMTP | — |
| Exportación Excel | xlsx | — |

---

## 3. DISEÑO DE LA BASE DE DATOS

La base de datos está definida y gestionada a través de **Prisma ORM** con migraciones versionadas. El proveedor es PostgreSQL.

### Diagrama de entidades

```
organizaciones ─────┬─── usuarios ──────────┬─── sesiones
                    │                        └─── logs_auditoria
                    ├─── categorias
                    ├─── tags
                    ├─── facturas ──────────┬─── factura_imagenes
                    │                       └─── factura_tags ─── tags
                    └─── logs_auditoria
```

### Descripción de tablas

#### `organizaciones`

Representa a cada empresa registrada en el sistema (el "tenant").

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | Identificador único de la organización |
| `razon_social` | VARCHAR(255) | Nombre legal de la empresa |
| `ruc` | VARCHAR(50) UNIQUE | Registro Único de Contribuyente panameño |
| `dv` | VARCHAR(10) | Dígito verificador del RUC |
| `plan_suscripcion` | VARCHAR(50) | Plan activo; por defecto `"Trial"` |
| `fecha_registro` | TIMESTAMPTZ | Fecha de alta en el sistema |

#### `usuarios`

Cada persona que puede autenticarse en el sistema. Un usuario pertenece siempre a una organización.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | Identificador único |
| `organizacion_id` | UUID FK | Referencia a `organizaciones` (CASCADE delete) |
| `nombre_completo` | VARCHAR(255) | Nombre visible del usuario |
| `email` | VARCHAR(255) UNIQUE | Credencial de acceso |
| `password_hash` | VARCHAR(255) | Contraseña hasheada con Bcrypt |
| `rol` | Enum `RolUsuario` | `SUPERADMIN`, `CONTADOR` o `EMPLEADO` |
| `activo` | BOOLEAN | Si `false`, el usuario no puede iniciar sesión |
| `reset_token` | VARCHAR(255) | Token hasheado para recuperación de contraseña |
| `reset_token_expires_at` | TIMESTAMPTZ | Expiración del token (ventana de 60 min) |
| `fecha_creacion` | TIMESTAMPTZ | Fecha de registro del usuario |

#### `facturas`

Registro central de cada comprobante fiscal subido al sistema.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | Identificador único |
| `organizacion_id` | UUID FK | Tenant propietario (CASCADE delete) |
| `usuario_id` | UUID FK nullable | Usuario que subió la factura (`SET NULL` al eliminar usuario) |
| `categoria_id` | UUID FK nullable | Categoría de gasto asignada |
| `nombre_proveedor` | VARCHAR(255) | Razón social del emisor de la factura |
| `ruc_proveedor` | VARCHAR(50) | RUC del proveedor |
| `dv_proveedor` | VARCHAR(10) | Dígito verificador del proveedor |
| `numero_factura` | VARCHAR(255) | Número único del comprobante |
| `cufe` | VARCHAR(255) | Código CUFE del QR DGI (si aplica) |
| `fecha_emision` | DATE | Fecha de emisión del comprobante |
| `subtotal` | DECIMAL(12,2) | Monto antes de impuestos |
| `itbms` | DECIMAL(12,2) | Impuesto de Transferencia de Bienes Muebles |
| `monto_total` | DECIMAL(12,2) | Total final de la factura |
| `estado` | VARCHAR(20) | `PENDIENTE`, `APROBADO` o `RECHAZADO` |
| `motivo_rechazo` | TEXT | Razón del rechazo (visible para el empleado) |
| `fecha_subida` | TIMESTAMPTZ | Timestamp de creación del registro |

#### `factura_imagenes`

Almacena las URLs de Cloudinary asociadas a una factura. Una factura puede tener hasta 10 imágenes.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | Identificador único de la imagen |
| `factura_id` | UUID FK | Referencia a `facturas` (CASCADE delete) |
| `url` | TEXT | URL pública en Cloudinary |
| `imagePublicId` | TEXT | ID de Cloudinary para operaciones futuras (ej: eliminación) |
| `orden` | INT | Posición en el carrusel de visualización |

#### `categorias`

Etiquetas contables por organización para clasificar facturas.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | Identificador único |
| `organizacion_id` | UUID FK | Organización propietaria (CASCADE delete) |
| `nombre` | VARCHAR(100) | Nombre de la categoría |
| `codigo_contable` | VARCHAR(50) | Código contable opcional |

Restricción única: `(organizacion_id, nombre)` — no pueden existir dos categorías con el mismo nombre en la misma organización.

#### `tags`

Etiquetas libres (color + texto) para facturación personalizada por organización.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | Identificador único |
| `organizacion_id` | UUID FK | Organización propietaria (CASCADE delete) |
| `nombre` | VARCHAR(50) | Texto del tag |
| `color` | VARCHAR(7) | Color hexadecimal (ej: `#3B82F6`) |

#### `factura_tags`

Tabla de relación N:N entre `facturas` y `tags`.

| Columna | Tipo | Descripción |
|---|---|---|
| `factura_id` | UUID PK/FK | Referencia a `facturas` |
| `tag_id` | UUID PK/FK | Referencia a `tags` |

#### `sesiones`

Registro de sesiones activas para validación de JWTs.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | Identificador de la sesión |
| `usuario_id` | UUID FK | Usuario propietario (CASCADE delete) |
| `token_id` | VARCHAR(255) | Identificador único del JWT (claim `jti`) |
| `expira_en` | TIMESTAMPTZ | Fecha de expiración del token |
| `creado_en` | TIMESTAMPTZ | Fecha de creación de la sesión |

#### `logs_auditoria`

Registro inmutable de acciones relevantes en el sistema.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID PK | Identificador único |
| `organizacion_id` | UUID FK | Organización del evento |
| `usuario_id` | UUID FK nullable | Usuario que ejecutó la acción (`SET NULL` al eliminar usuario) |
| `accion` | VARCHAR(100) | Nombre de la acción ejecutada |
| `detalle` | JSON | Datos adicionales del evento |
| `fecha` | TIMESTAMPTZ | Timestamp del evento |

### Enumeraciones

```sql
enum RolUsuario {
  SUPERADMIN  -- Administrador raíz de la organización
  CONTADOR    -- Auditor con acceso al panel de administración
  EMPLEADO    -- Usuario base que registra facturas
}

enum EstadoFactura {
  PENDIENTE   -- Sin revisión (estado inicial)
  APROBADO    -- Aprobada por un administrador
  RECHAZADO   -- Rechazada con motivo registrado
}
```

### Políticas de eliminación referencial

| Relación | Política | Razón |
|---|---|---|
| `organizaciones → usuarios` | CASCADE | Al eliminar la organización, todos sus usuarios se eliminan |
| `organizaciones → facturas` | CASCADE | Al eliminar la organización, todas sus facturas se eliminan |
| `usuarios → facturas` | SET NULL | Al eliminar un usuario, sus facturas se preservan para auditoría |
| `usuarios → logs_auditoria` | SET NULL | Los logs históricos se conservan aunque el usuario ya no exista |
| `facturas → factura_imagenes` | CASCADE | Las imágenes no tienen sentido sin la factura |

---

## 4. BACKEND — NESTJS

El backend está construido con **NestJS 11** bajo una arquitectura modular. Cada módulo encapsula sus propios controladores, servicios, repositorios, DTOs, entidades y guards.

### 4.1 Estructura de Módulos

```
src/
├── main.ts                    # Bootstrap de la aplicación (puerto, CORS, pipes globales)
├── app.module.ts              # Módulo raíz: importa todos los módulos del sistema
├── prisma/
│   ├── prisma.module.ts       # Módulo global de Prisma
│   └── prisma.service.ts      # Cliente Prisma inyectable
├── modules/
│   ├── auth/                  # Módulo de autenticación y gestión de usuarios
│   └── registro-gastos/       # Módulo de facturas y procesamiento OCR
└── infrastructure/
    ├── mail/                  # Servicio de correo transaccional (Nodemailer)
    ├── ocr/                   # Integración con Azure Document Intelligence
    ├── storage/               # Integración con Cloudinary
    └── tasks/                 # Tareas programadas (ej: limpieza de tokens expirados)
```

### 4.2 Módulo de Autenticación (`auth`)

El módulo `AuthModule` gestiona todo el ciclo de vida de identidad: registro de organización, login, recuperación de contraseña, gestión de usuarios de la misma organización e invitaciones.

#### Estructura interna

```
modules/auth/
├── auth.module.ts
├── controllers/
│   └── auth.controller.ts      # Expone todos los endpoints bajo /auth
├── services/
│   ├── auth.service.ts         # Lógica de negocio: login, logout, invitación, roles
│   └── onboarding.service.ts   # Creación atómica de organización + admin SUPERADMIN
├── repositories/
│   └── auth.repository.ts      # Todas las consultas a Prisma relacionadas con users/orgs
├── guards/
│   ├── jwt.guard.ts            # Valida JWT y adjunta payload al request
│   └── roles.guard.ts          # Valida que el rol del JWT coincida con @Roles()
├── strategies/
│   └── jwt.strategy.ts         # Configuración Passport JWT
├── decorators/
│   ├── roles.decorator.ts      # @Roles(Role.SUPERADMIN, ...) metadata decorator
│   └── current-user.decorator.ts  # @CurrentUser() extrae payload del request
├── dto/
│   ├── login.dto.ts
│   ├── complete-onboarding.dto.ts
│   ├── invite-user.dto.ts
│   ├── forgot-password.dto.ts
│   ├── reset-password.dto.ts
│   ├── change-password.dto.ts
│   ├── update-user-role.dto.ts
│   └── update-user-status.dto.ts
└── entities/
    ├── user.entity.ts              # Serialización de respuesta de usuario (oculta password_hash)
    ├── organization.entity.ts      # Serialización de organización
    └── auth-response.entity.ts     # Respuesta de login/register/onboarding con JWT incluido
```

#### Flujo del Onboarding

El onboarding crea en una **transacción atómica** (`prisma.$transaction`) la organización y el primer usuario SUPERADMIN. Si cualquiera de los dos pasos falla, se hace rollback completo.

```
POST /auth/onboarding
  ├── Valida DTO (razón social, RUC, DV, email, contraseña)
  ├── Verifica que el email no esté en uso (lanza 409 si existe)
  ├── prisma.$transaction([
  │     createOrganizacion(...),
  │     createUsuario({ rol: SUPERADMIN, organizacion_id })
  │   ])
  ├── Genera JWT firmado
  └── Retorna { organization, authData: { token, user } }
```

#### Flujo de Login

```
POST /auth/login
  ├── Busca usuario por email
  ├── Si no existe → 401 (mensaje genérico, no revela si el email está registrado)
  ├── Si activo === false → 403 "Cuenta desactivada"
  ├── Compara password con bcrypt.compare()
  ├── Si no coincide → 401 (mensaje genérico)
  ├── Registra sesión en tabla `sesiones`
  └── Retorna JWT firmado + datos del usuario
```

#### Recuperación de Contraseña

```
POST /auth/forgot-password
  ├── Busca usuario por email (sin revelar si existe)
  ├── Genera token aleatorio de 32 bytes
  ├── Hashea el token con bcrypt y lo guarda en BD con TTL de 60 minutos
  ├── Envía correo con el token en texto plano (link único)
  └── Retorna mensaje genérico siempre (seguridad anti-enumeración)

POST /auth/reset-password
  ├── Busca usuario cuyo reset_token no sea null y no haya expirado
  ├── Verifica el token contra el hash almacenado
  ├── prisma.$transaction([
  │     updatePassword(bcrypt.hash(newPassword)),
  │     clearResetToken()        ← invalidación inmediata post-uso
  │   ])
  └── Retorna confirmación
```

### 4.3 Módulo de Registro de Gastos (`registro-gastos`)

Este módulo gestiona el ciclo completo de las facturas: procesamiento OCR/QR, CRUD, auditoría y exportación.

#### Estructura interna

```
modules/registro-gastos/
├── registro-gastos.module.ts
├── registro-gastos.tokens.ts    # Tokens de inyección para Strategy Pattern
├── controllers/
│   ├── registro-gastos.controller.ts  # Endpoints de facturas
│   └── categoria.controller.ts        # CRUD de categorías
├── services/
│   └── registro-gastos.service.ts     # Orquesta el procesamiento y persistencia
├── repositories/
│   └── registro-gastos.repository.ts  # Consultas Prisma filtradas por organizacion_id
├── strategies/
│   ├── factura-procesar.strategy.interface.ts  # Interfaz del pipeline de procesamiento
│   └── factura-procesar.strategy.ts            # Implementación: QR → DGI → OCR fallback
├── dto/
│   ├── factura.dto.ts           # CreateFacturaDto, UpdateFacturaDto, ExportInvoicesDto
│   └── categoria.dto.ts
├── entities/
│   └── factura.entity.ts        # Serialización de respuesta con @Exclude en campos sensibles
└── interfaces/
    └── export-strategy.interface.ts   # Interfaz para estrategia de exportación
```

#### Strategy Pattern — Pipeline de procesamiento

El procesamiento de facturas implementa el **Strategy Pattern** para el manejo dual QR+OCR:

```
POST /registro-gastos/procesar-factura
  │
  ├── [Validación] Archivos: tipo imagen, max 5MB c/u, max 10 archivos
  │
  ├── [Paso 1] ¿Se recibió clientQrData? (dato QR decodificado en el browser)
  │     ├── SÍ → Verificar QR contra DGI (web scraping)
  │     │         ├── DGI válido → Retornar datos oficiales de DGI ✓
  │     │         └── DGI inválido/error → Continuar al Paso 2
  │     └── NO → Continuar al Paso 2
  │
  └── [Paso 2] Invocar Azure Document Intelligence (OCR fallback)
                ├── Extraer texto de cada imagen individualmente
                ├── Concatenar todos los textos (para facturas de múltiples páginas)
                ├── Parsear con parseDgiPanama() (regex especializados para formato DGI)
                ├── Parsear cada imagen por separado
                ├── Merge inteligente: elegir el valor más completo y confiable
                └── Retornar resultado final mergeado
```

#### Patrón Repository — Aislamiento multi-tenant

Todos los métodos del repository reciben `organizacion_id` como parámetro obligatorio y lo aplican como cláusula `WHERE` en cada consulta de Prisma. Este `organizacion_id` **nunca proviene del body del request** — siempre se extrae del payload JWT validado por el guard.

```typescript
// Ejemplo de método en el repository:
async getFacturaById(id: string, organizacionId: string): Promise<facturas | null> {
  return this.prisma.facturas.findFirst({
    where: {
      id,
      organizacion_id: organizacionId,  // ← Aislamiento garantizado
    },
    include: { imagenes: true, categorias: true }
  });
}
```

### 4.4 Infraestructura de Servicios Externos

#### Servicio OCR — Azure Document Intelligence (`infrastructure/ocr/`)

- **Clase:** `AzureOcrService`
- **Modelo utilizado:** `prebuilt-read` (extracción de texto libre)
- **Estrategia multi-imagen:** Extrae texto de cada imagen de forma independiente, combina todos los fragmentos en un único documento y parsea el resultado con expresiones regulares especializadas para el formato DGI Panamá (`parseDgiPanama()`).
- **Merge inteligente:** Si múltiples imágenes contienen la misma factura desde ángulos distintos, el algoritmo de merge selecciona el valor más largo y no vacío para cada campo.
- **Campos extraídos:** Nombre proveedor, RUC, DV, número de factura, CUFE, fecha de emisión, subtotal, ITBMS, total.

#### Servicio de Almacenamiento — Cloudinary (`infrastructure/storage/`)

- **Clase:** `CloudinaryService`
- **Interface:** `StorageInterface` (desacoplado para facilitar cambio de proveedor)
- **Operaciones:** `uploadFile(buffer, folder)` → retorna `{ url, publicId }`
- Las imágenes se suben antes de crear el registro en BD. Si Cloudinary falla, la transacción no se completa y no se crea el registro de factura.

#### Servicio de Correo — Nodemailer (`infrastructure/mail/`)

- **Configuración:** Variables de entorno `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- **Correos enviados:**
  - Recuperación de contraseña (con enlace único de 60 min)
  - Invitación de nuevo usuario (con contraseña temporal generada)

### 4.5 Referencia de API REST

Todos los endpoints protegidos requieren el header:
```
Authorization: Bearer <JWT>
```

#### Autenticación (`/auth`)

| Método | Ruta | Auth | Rol | Descripción |
|---|---|---|---|---|
| POST | `/auth/onboarding` | No | — | Registrar nueva empresa y admin |
| POST | `/auth/login` | No | — | Iniciar sesión |
| POST | `/auth/logout` | Sí | Cualquiera | Cerrar sesión |
| GET | `/auth/me` | Sí | Cualquiera | Obtener perfil del usuario autenticado |
| PATCH | `/auth/change-password` | Sí | Cualquiera | Cambiar contraseña |
| POST | `/auth/forgot-password` | No | — | Solicitar reset de contraseña |
| POST | `/auth/reset-password` | No | — | Aplicar nuevo password con token |
| GET | `/auth/users` | Sí | SUPERADMIN | Listar usuarios de la organización |
| POST | `/auth/invite` | Sí | SUPERADMIN | Invitar nuevo usuario por email |
| PATCH | `/auth/users/:id/status` | Sí | SUPERADMIN | Activar/desactivar usuario |
| PATCH | `/auth/users/:id/role` | Sí | SUPERADMIN | Cambiar rol de usuario |
| DELETE | `/auth/users/:id` | Sí | SUPERADMIN | Eliminar usuario |

#### Facturas (`/registro-gastos`)

| Método | Ruta | Auth | Rol | Descripción |
|---|---|---|---|---|
| POST | `/registro-gastos/procesar-factura` | Sí | Todos | Procesar imágenes con QR/OCR |
| GET | `/registro-gastos` | Sí | SUPERADMIN, CONTADOR | Listar todas las facturas de la organización |
| GET | `/registro-gastos/mis-facturas` | Sí | Todos | Listar facturas del usuario autenticado |
| GET | `/registro-gastos/:id` | Sí | Todos | Obtener detalle de una factura |
| POST | `/registro-gastos` | Sí | Todos | Crear / guardar factura procesada |
| PUT | `/registro-gastos/:id` | Sí | Todos | Actualizar datos de una factura |
| PATCH | `/registro-gastos/:id/estado` | Sí | SUPERADMIN, CONTADOR | Aprobar o rechazar factura |
| DELETE | `/registro-gastos/:id` | Sí | Todos | Eliminar factura (solo pendientes propias) |
| POST | `/registro-gastos/export` | Sí | SUPERADMIN, CONTADOR | Exportar listado a Excel |

#### Categorías (`/categorias`)

| Método | Ruta | Auth | Rol | Descripción |
|---|---|---|---|---|
| GET | `/categorias` | Sí | Todos | Listar categorías de la organización |
| POST | `/categorias` | Sí | SUPERADMIN, CONTADOR | Crear categoría |
| PUT | `/categorias/:id` | Sí | SUPERADMIN, CONTADOR | Actualizar categoría |
| DELETE | `/categorias/:id` | Sí | SUPERADMIN, CONTADOR | Eliminar categoría |

---

## 5. FRONTEND — ANGULAR

La aplicación frontend está construida con **Angular 19** usando exclusivamente **Standalone Components** (sin NgModules). Utiliza lazy loading por ruta para cargar únicamente el código necesario en cada sección.

### 5.1 Estructura de la Aplicación

```
src/app/
├── app.component.ts/html/css    # Shell raíz: monta <router-outlet> y <app-toast>
├── app.config.ts                # Configuración global: provideRouter, provideHttpClient, interceptores
├── app.routes.ts                # Rutas raíz con lazy loading por feature
│
├── core/                        # Servicios y utilidades transversales (no UI)
│   ├── guards/
│   │   ├── auth.guard.ts        # Verifica que el usuario esté autenticado
│   │   └── role.guard.ts        # Verifica que el rol del JWT coincida con la ruta
│   ├── interceptors/
│   │   └── jwt.interceptor.ts   # Adjunta el token Bearer a cada request HTTP saliente
│   ├── models/
│   │   └── roles.enum.ts        # Enum Role: SUPERADMIN | CONTADOR | EMPLEADO
│   └── services/
│       └── qr-scanner.service.ts  # Wrapper de zxing-wasm para decodificación QR en browser
│
├── features/                    # Módulos funcionales por dominio
│   ├── auth/                    # Login, registro, onboarding, recuperación de contraseña
│   ├── registro-factura/        # Carga, procesamiento y vista de facturas (empleado)
│   └── admin/                   # Panel de auditoría y gestión de usuarios (admin)
│
└── shared/                      # Componentes reutilizables sin lógica de dominio
    ├── button/                  # <app-button> con variantes y estados de carga
    ├── input/                   # <app-input> con validación integrada
    ├── modal/                   # <app-modal> shell genérico para todos los diálogos
    ├── navbar/                  # <app-navbar> responsive con menú de usuario
    ├── sidebar/                 # <app-sidebar> en el módulo admin
    ├── toast/                   # <app-toast> sistema de notificaciones con barra de progreso
    ├── factura-view/            # Visor sticky de imágenes con lightbox
    ├── invoice-audit-modal/     # Modal de auditoría de factura (detalles + aprobación/rechazo)
    ├── not-found/               # Página 404 personalizada
    └── validators/              # Validadores reactivos reutilizables
```

### 5.2 Sistema de Rutas y Lazy Loading

Las rutas se definen en `app.routes.ts` con tres grupos principales:

```
/auth/**          → authRoutes        (público, sin guards)
/facturas/**      → registroFacturaRoutes  (authGuard + roleGuard([EMPLEADO]))
/admin/**         → adminRoutes       (authGuard + roleGuard([SUPERADMIN, CONTADOR]))
/               → redirect a /auth/login
/**             → NotFoundComponent (404)
```

Cada módulo de features declara sus sub-rutas en un archivo `*.routes.ts` independiente y se carga de forma diferida (`loadChildren`), lo que reduce el tamaño del bundle inicial.

**Sub-rutas de autenticación (`/auth`):**

| Ruta | Componente | Descripción |
|---|---|---|
| `/auth/login` | `LoginComponent` | Formulario de acceso |
| `/auth/onboarding` | `OnboardingComponent` | Wizard de 2 pasos (con sub-rutas hijo) |
| `/auth/forgot-password` | `ForgotPasswordComponent` | Solicitud de reset |
| `/auth/reset-password` | `ResetPasswordComponent` | Formulario de nueva contraseña |

**Sub-rutas del empleado (`/facturas`):**

| Ruta | Componente | Descripción |
|---|---|---|
| `/facturas/cargar` | `CargarFacturaPage` | Carga y procesamiento de facturas |
| `/facturas/mis-facturas` | `MisFacturasPage` | Tabla de facturas propias |

**Sub-rutas del administrador (`/admin`):**

| Ruta | Componente | Descripción |
|---|---|---|
| `/admin/facturas` | `AdminFacturasPage` | Panel de auditoría |
| `/admin/usuarios` | `AdminUsuariosPage` | Gestión de usuarios |

### 5.3 Módulo de Autenticación

#### Páginas

**`LoginComponent`**  
Formulario reactivo con validación de email y contraseña. Manejo de errores HTTP: 401 (credenciales inválidas), 403 (cuenta desactivada). Tras autenticación exitosa, redirige según el rol del token: `SUPERADMIN/CONTADOR → /admin/facturas`, `EMPLEADO → /facturas/cargar`.

**`OnboardingComponent`**  
Wizard orquestador de dos pasos que usa `router-outlet` para alojar los pasos como componentes hijos. El estado compartido (datos de empresa + datos de admin) se gestiona mediante un servicio de sesión temporal `OnboardingService`. La acción de envío final se ejecuta en el componente padre al recibir el evento `submitData` del paso 2.

- `OnboardingPaso1Component`: formulario de datos corporativos (razón social, RUC, DV).
- `OnboardingPaso2Component`: formulario de cuenta del administrador (nombre, email, contraseña).

**`ForgotPasswordComponent` / `ResetPasswordComponent`**  
Implementan el flujo de dos pasos de recuperación de contraseña. `ResetPasswordComponent` lee el token de los `queryParams` de la URL.

#### Servicios

**`AuthService`** (`features/auth/services/`)  
- `login(credentials)` → almacena el JWT en `localStorage` y actualiza el estado reactivo.
- `logout()` → elimina el token y redirige a `/auth/login`.
- `getToken()` → retorna el JWT almacenado.
- `saveSession(authData)` → persiste el token tras onboarding.
- `isAuthenticated()` → verifica existencia y no-expiración del token decodificando el payload localmente.

**`OnboardingService`** (`features/auth/services/`)  
Servicio de estado efímero para los datos del wizard. Acumula los datos de ambos pasos y ejecuta el POST final a `/auth/onboarding`.

### 5.4 Módulo de Registro de Facturas

Este es el módulo principal del rol **EMPLEADO**.

#### Página `CargarFacturaPage`

Orquesta los tres sub-componentes del flujo de carga:

```
CargarFacturaPage
├── CargarArchivoComponent     ← Zona de arrastrar y soltar imágenes
├── FacturaFormComponent       ← Formulario editable con datos extraídos por OCR
└── FacturaViewComponent       ← Visor sticky con lightbox
```

**Flujo de interacción:**

1. El usuario arrastra imágenes a `CargarArchivoComponent`.
2. El componente de archivo ejecuta la decodificación QR en el browser con `QrScannerService` (zxing-wasm).
3. El resultado del QR (o `null`) se envía al backend junto con los buffers de imagen.
4. El backend responde con los datos extraídos (OCR o DGI).
5. `FacturaFormComponent` recibe los datos y los coloca en el formulario reactivo para revisión.
6. El usuario corrige campos si es necesario, elige categoría y guarda.
7. Al guardar, el `CargarArchivoComponent` mantiene su estado (para seguir trabajando) hasta que el usuario pulse "Descartar todo", donde se llama `@ViewChild reset()`.

#### Página `MisFacturasPage`

Tabla paginada con las facturas del usuario autenticado. Columnas: fecha, comercio (avatar con iniciales), categoría, N° factura, total, estado. Las facturas rechazadas muestran un ícono informativo con el motivo en tooltip.

### 5.5 Módulo de Administración

#### Página `AdminFacturasPage`

Panel centralizado para SUPERADMIN y CONTADOR.

**Componentes internos:**

| Componente | Responsabilidad |
|---|---|
| `InvoiceFilterComponent` | Toolbar con filtros: estado, rango de fechas, categoría, empleado |
| `InvoiceListComponent` | Tabla con paginación del servidor, selección múltiple y acciones |
| `InvoiceAuditModal` | Modal de detalle: imágenes, campos, historial; acciones: aprobar / rechazar |
| `ExportExcelCsvComponent` | Botón de exportación con filtros aplicados |

**Flujo de auditoría:**

1. El admin selecciona una factura de la tabla.
2. Se abre `InvoiceAuditModal` con los detalles completos incluidas las imágenes en carrusel.
3. El admin puede aprobar (1 clic) o rechazar (requiere ingresar motivo).
4. La acción llama al endpoint `PATCH /registro-gastos/:id/estado`.
5. Se emite un toast de éxito y la tabla se recarga.

#### Página `AdminUsuariosPage`

Panel de gestión de miembros de la organización.

**Componentes internos:**

| Componente | Responsabilidad |
|---|---|
| `UserTableComponent` | Tabla de usuarios con avatar, rol, estado y menú de acciones |
| `UserInviteModal` | Modal para invitar nuevo usuario: email (req.), nombre (opc.), rol |
| `UserActionModal` | Modal de confirmación para cambio de rol, activar/desactivar, eliminar |
| `UserRoleGuideComponent` | Panel descriptivo de los roles disponibles |

**Protecciones de negocio en UI:**

- El SUPERADMIN no puede ejecutar acciones sobre su propia cuenta (el botón se deshabilita).
- Las opciones del menú contextual se habilitan/deshabilitan según el rol del usuario objetivo.

### 5.6 Core — Guards, Interceptores y Servicios

#### `authGuard` (`core/guards/auth.guard.ts`)

Guard funcional de Angular (`CanActivateFn`). Verifica que exista un token en `localStorage` y que no haya expirado. Si el token expiró, ejecuta logout y redirige a `/auth/login`. Si el token es válido, permite el acceso.

#### `roleGuard` (`core/guards/role.guard.ts`)

Guard funcional de tipo fábrica: `roleGuard([Role.SUPERADMIN, Role.CONTADOR])`. Decodifica el payload del JWT localmente (sin petición al backend) y comprueba que el rol del usuario esté en la lista de roles permitidos para la ruta. Si el rol no coincide, redirige al home correspondiente al rol actual.

**Lógica de decodificación JWT local:**
- Divide el token en 3 partes por `.`
- Decodifica la parte central (payload) en Base64
- Parsea el JSON resultante
- Compara `exp * 1000` con `Date.now()` para verificar expiración

#### `jwtInterceptor` (`core/interceptors/jwt.interceptor.ts`)

Interceptor HTTP funcional. En cada petición HTTP saliente, recupera el token con `AuthService.getToken()` y, si existe, clona la petición añadiendo el header `Authorization: Bearer <token>`. Las peticiones a rutas públicas (login, onboarding, reset-password) funcionan igualmente ya que el backend simplemente ignora el header en endpoints sin guard.

#### `QrScannerService` (`core/services/qr-scanner.service.ts`)

Wrapper del paquete `zxing-wasm`. Lee los bytes de cada imagen en el browser y busca un código QR. Si lo encuentra, retorna el texto decodificado (que es la URL del registro DGI). Ejecuta en WebAssembly: no incurre en costos de API ni latencia de red.

### 5.7 Componentes Compartidos (Shared)

#### `<app-modal>` (`shared/modal/`)

Componente shell genérico para todos los modales del sistema. Es el único origen de verdad del diseño de diálogos.

**Propiedades de entrada (`@Input`):**

| Prop | Tipo | Descripción |
|---|---|---|
| `title` | `string` | Título del modal |
| `variant` | `'default' \| 'info' \| 'success' \| 'warning' \| 'danger'` | Paleta de colores del header |
| `size` | `'sm' \| 'md' \| 'lg'` | Ancho del panel |
| `isOpen` | `boolean` | Controla visibilidad |

**Slots de contenido (`ng-content`):**

```html
<app-modal [isOpen]="showModal" variant="danger" size="md">
  <div modal-icon><!-- ícono SVG --></div>
  <div modal-body><!-- contenido --></div>
  <div modal-footer><!-- botones de acción --></div>
</app-modal>
```

**Comportamiento:** Cierre automático al pulsar `Escape` o hacer clic en el backdrop. Emite evento `(closed)` al cerrarse.

#### `<app-toast>` (`shared/toast/`)

Sistema de notificaciones no bloqueantes montado globalmente en `AppComponent`.

**`ToastService` — API pública:**

```typescript
toastService.success(title: string, message?: string, durationMs?: number)
toastService.error(title: string, message?: string, durationMs?: number)
toastService.warning(title: string, message?: string, durationMs?: number)
toastService.info(title: string, message?: string, durationMs?: number)
```

**Características visuales:**
- Animación de entrada desde la derecha con `cubic-bezier` (efecto bounce)
- Barra de progreso animada en la base indica el tiempo restante de visibilidad
- Píldona de ícono de 34×34 px con color específico por variante
- `z-index: 11000` — visible sobre cualquier modal o capa de la interfaz
- Duración por defecto: 4 segundos (configurable por mensaje)

#### `<app-factura-view>` (`shared/factura-view/`)

Visor sticky de las imágenes de una factura. En estado normal tiene `z-index: 1` (debajo del navbar). Al activar el lightbox emite `@Output() lightboxChange: EventEmitter<boolean>` que el componente padre usa para aplicar la clase `viewer--lightbox` elevando el z-index a `1001`.

#### `<app-navbar>` (`shared/navbar/`)

Barra de navegación responsive. Muestra el nombre del usuario, el rol activo y un menú desplegable con opción de cierre de sesión. El z-index se gestiona dinámicamente para no solaparse con el visor de facturas.

---

## 6. MODELO DE SEGURIDAD

### Roles y permisos

| Acción | EMPLEADO | CONTADOR | SUPERADMIN |
|---|---|---|---|
| Registrar facturas propias | ✅ | ✅ | ✅ |
| Ver propias facturas | ✅ | ✅ | ✅ |
| Ver todas las facturas de la organización | ❌ | ✅ | ✅ |
| Aprobar / rechazar facturas | ❌ | ✅ | ✅ |
| Exportar a Excel | ❌ | ✅ | ✅ |
| Ver lista de usuarios | ❌ | ❌ | ✅ |
| Invitar usuarios | ❌ | ❌ | ✅ |
| Cambiar roles | ❌ | ❌ | ✅ |
| Activar / desactivar usuarios | ❌ | ❌ | ✅ |
| Eliminar usuarios | ❌ | ❌ | ✅ |

### Capas de protección

El sistema implementa defensa en profundidad con múltiples capas independientes:

**Capa 1 — Guard de ruta (Frontend)**  
`roleGuard` impide la navegación a rutas no autorizadas antes de que se cargue el componente. Redirige al home correcto según el rol.

**Capa 2 — Interceptor JWT (Frontend)**  
Adjunta automáticamente el token a todas las peticiones. Si el token no existe o expira mientras el usuario navega, el backend retorna 401 y el `AuthService` fuerza el logout.

**Capa 3 — `JwtAuthGuard` (Backend)**  
Valida la firma del JWT en cada request a endpoints protegidos. Un token inválido o expirado resulta en 401.

**Capa 4 — `RolesGuard` (Backend)**  
Compara el rol del payload JWT con los roles declarados en `@Roles(...)` del controlador. Un rol insuficiente resulta en 403.

**Capa 5 — Aislamiento por `organizacion_id` (Repository)**  
Toda consulta a la base de datos incluye `organizacion_id` extraído del JWT. Es imposible acceder a datos de otra organización aunque se conozca el UUID del recurso.

**Capa 6 — Protecciones de negocio (Service)**  
Reglas en el servicio que no dependen de roles sino de lógica de negocio:
- No se puede eliminar la propia cuenta
- No se puede eliminar al último administrador
- Un SUPERADMIN no puede ser degradado por un role inferior
- Los tokens de reset-password se invalidan inmediatamente después de su primer uso

### Estructura del JWT

```json
{
  "sub":            "uuid-del-usuario",
  "email":          "usuario@empresa.com",
  "role":           "SUPERADMIN",
  "organizationId": "uuid-de-la-organizacion",
  "iat":            1740000000,
  "exp":            1740086400
}
```

---

## 7. FLUJOS DE DATOS CRÍTICOS

### 7.1 Registro completo de una factura

```
Browser                           Backend                      Servicios externos
  │                                  │                               │
  ├─ Usuario arrastra imagen(s)       │                               │
  │                                  │                               │
  ├─ QrScannerService decodifica QR  │                               │
  │  (WebAssembly, sin costo)         │                               │
  │                                  │                               │
  ├─ POST /registro-gastos/procesar-factura                          │
  │  files: [buffer1, ...] + clientQrData                           │
  │                                  │                               │
  │                       [¿clientQrData existe?]                    │
  │                         SÍ → Web scraping DGI ──────────────────▶ DGI
  │                                  │◀── datos oficiales ──────────┤
  │                                  │                               │
  │                         NO / DGI falla:                          │
  │                         Azure OCR ──────────────────────────────▶ Azure
  │                                  │◀── texto extraído ───────────┤
  │                                  │                               │
  │◀─ { proveedor, RUC, DV, fecha, total, ... }                     │
  │                                  │                               │
  ├─ Usuario revisa y ajusta el formulario                           │
  │                                  │                               │
  ├─ POST /registro-gastos (datos del formulario)                    │
  │                                  │                               │
  │                       Upload imágenes ──────────────────────────▶ Cloudinary
  │                                  │◀── { url, publicId } ────────┤
  │                                  │                               │
  │                       prisma.$create(factura + imagenes)         │
  │                                  │                               │
  │◀─ 201 { factura creada }         │                               │
  │                                  │                               │
  ├─ Toast "Factura guardada exitosamente"                           │
```

### 7.2 Auditoría de una factura

```
Browser (Admin)                   Backend
  │                                  │
  ├─ GET /registro-gastos (con filtros)
  │◀─ [listado paginado]             │
  │                                  │
  ├─ Clic en fila → abre InvoiceAuditModal
  │                                  │
  ├─ PATCH /registro-gastos/:id/estado
  │  body: { estado: "APROBADO" }
  │   o    { estado: "RECHAZADO", motivoRechazo: "..." }
  │                                  │
  │                       RolesGuard verifica CONTADOR/SUPERADMIN
  │                       repository.updateEstado(id, orgId, estado)
  │◀─ 200 { factura actualizada }    │
  │                                  │
  ├─ Toast "Factura aprobada" / "Factura rechazada"
  ├─ Modal se cierra
  └─ Tabla se recarga
```

### 7.3 Invitación de usuario

```
Browser (SUPERADMIN)              Backend                      SMTP
  │                                  │                           │
  ├─ POST /auth/invite               │                           │
  │  { email, nombre?, rol }         │                           │
  │                                  │                           │
  │                       RolesGuard verifica SUPERADMIN         │
  │                       Genera contraseña temporal             │
  │                       Hashea con bcrypt                      │
  │                       Crea usuario en BD                     │
  │                       Envía correo de bienvenida ───────────▶ SMTP
  │                                  │◀── ack ──────────────────┤
  │◀─ 201 { user, tempPassword }     │
  │                                  │
  ├─ Toast "Invitación enviada"
```

---

## 8. INTEGRACIONES CON SERVICIOS EXTERNOS

### Azure Document Intelligence

- **Propósito:** Extracción de texto de imágenes de facturas cuando no hay QR.
- **Endpoint utilizado:** `prebuilt-read` (texto libre, más flexible que `prebuilt-invoice` para el formato DGI panameño).
- **Autenticación:** API Key en header `Ocp-Apim-Subscription-Key`.
- **Variables requeridas:** `AZURE_OCR_ENDPOINT`, `AZURE_OCR_KEY`.
- **Manejo de errores:** Si Azure falla o hace timeout, se lanza una excepción que el controlador captura y retorna como 500 con mensaje descriptivo al frontend.

### Cloudinary

- **Propósito:** Almacenamiento y CDN de imágenes de facturas.
- **Implementación:** `CloudinaryService` implementa la interfaz `StorageInterface`.
- **Variables requeridas:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- **Estrategia de nombrado:** Carpetas por organización (`/expensly/{organizacion_id}/`).
- **Nota:** Las imágenes se suben **antes** de persistir el registro en la BD. Si la subida falla, no se crea ningún registro.

### DGI Panamá (web scraping)

- **Propósito:** Verificar y obtener los datos oficiales de una factura a partir de su código QR.
- **Técnica:** HTTP fetch al portal de DGI con el CUFE extraído del QR.
- **Costo:** Cero (no es una API de pago).
- **Resiliencia:** Si DGI no responde, el sistema hace fallback automático a Azure OCR sin que el usuario perciba el error interno.

### Nodemailer + SMTP

- **Propósito:** Correos transaccionales (recuperación de contraseña e invitaciones).
- **Configuración:** Compatible con cualquier proveedor SMTP estándar (Gmail, SendGrid, Mailgun, etc.).
- **Manejo de errores:** Los fallos de envío se capturan y se registran en los logs, pero no interrumpen el flujo principal (la cuenta se crea igualmente aunque el correo falle).

### zxing-wasm (Browser)

- **Propósito:** Decodificar códigos QR directamente en el browser del usuario.
- **Ejecución:** WebAssembly — no requiere backend ni conexión a servicios externos.
- **Ventaja:** Para la mayoría de facturas formales en Panamá (que tienen QR), el procesamiento tiene costo cero de API.

---

## 9. VARIABLES DE ENTORNO Y CONFIGURACIÓN

### Backend (`backend/.env`)

```env
# Base de datos
DATABASE_URL="postgresql://usuario:contraseña@host:5432/expensly"

# JWT
JWT_SECRET="clave-secreta-muy-larga-y-aleatoria"
JWT_EXPIRATION="24h"

# Azure Document Intelligence
AZURE_OCR_ENDPOINT="https://tu-recurso.cognitiveservices.azure.com/"
AZURE_OCR_KEY="tu-api-key-azure"

# Cloudinary
CLOUDINARY_CLOUD_NAME="tu-cloud-name"
CLOUDINARY_API_KEY="tu-api-key"
CLOUDINARY_API_SECRET="tu-api-secret"

# SMTP (correo transaccional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="correo@empresa.com"
SMTP_PASS="contraseña-de-aplicación"
SMTP_FROM="Expensly <noreply@expensly.app>"

# Aplicación
PORT=3000
FRONTEND_URL="http://localhost:4200"
```

### Frontend (`frontend/src/environments/`)

```typescript
// environment.ts (desarrollo)
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000'
};

// environment.prod.ts (producción)
export const environment = {
  production: true,
  apiUrl: 'https://api.expensly.app'
};
```

---

## 10. GUÍA DE DESARROLLO LOCAL

### Prerrequisitos

- Node.js 20+
- npm 10+
- PostgreSQL 15+ (o cuenta en Supabase)
- Angular CLI (`npm install -g @angular/cli`)
- NestJS CLI (`npm install -g @nestjs/cli`)

### Levantar el Backend

```bash
cd backend

# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 3. Ejecutar migraciones de base de datos
npx prisma migrate dev

# 4. Generar el cliente Prisma
npm run prisma:generate

# 5. Iniciar el servidor en modo desarrollo
nest start --watch
# El servidor queda en http://localhost:3000
```

### Levantar el Frontend

```bash
cd frontend

# 1. Instalar dependencias
npm install

# 2. Iniciar el servidor de desarrollo
ng serve
# La aplicación queda en http://localhost:4200
```

### Comandos útiles

| Comando | Descripción |
|---|---|
| `npx prisma studio` | Abre el explorador visual de la BD en el browser |
| `npx prisma migrate dev --name nombre` | Crea y aplica una nueva migración |
| `npm run prisma:generate` | Regenera el cliente Prisma + ejecuta fix-generated.js |
| `ng build --configuration production` | Build optimizado para producción |
| `nest build` | Compilación del backend TypeScript |

### Migraciones ejecutadas

| Migración | Descripción |
|---|---|
| `20260219215105_init` | Esquema inicial: todas las tablas y relaciones base |
| `20260221195709_tabla_imgs_factura` | Nueva tabla `factura_imagenes` para múltiples imágenes |
| `20260225184055_add_dv_proveedor_to_facturas` | Campo `dv_proveedor` en `facturas` |
| `20260225204250_add_subtotal_to_facturas` | Campo `subtotal` en `facturas` |

---

*Documentación técnica preparada por el equipo de desarrollo de Expensly.*
*Versión MVP 1.0.0 — Rama `main` — 1 de marzo de 2026*
esarrollo
ng serve
# La aplicación queda en https://expensly-app.vercel.app
```

### Comandos útiles

| Comando | Descripción |
|---|---|
| `npx prisma studio` | Abre el explorador visual de la BD en el browser |
| `npx prisma migrate dev --name nombre` | Crea y aplica una nueva migración |
| `npm run prisma:generate` | Regenera el cliente Prisma + ejecuta fix-generated.js |
| `ng build --configuration production` | Build optimizado para producción |
| `nest build` | Compilación del backend TypeScript |

### Migraciones ejecutadas

| Migración | Descripción |
|---|---|
| `20260219215105_init` | Esquema inicial: todas las tablas y relaciones base |
| `20260221195709_tabla_imgs_factura` | Nueva tabla `factura_imagenes` para múltiples imágenes |
| `20260225184055_add_dv_proveedor_to_facturas` | Campo `dv_proveedor` en `facturas` |
| `20260225204250_add_subtotal_to_facturas` | Campo `subtotal` en `facturas` |

---

*Documentación técnica preparada por el equipo de desarrollo de Expensly.*
*Versión MVP 1.0.0 — Rama `main` — 1 de marzo de 2026*
