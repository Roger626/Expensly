DOCUMENTACIÓN TÉCNICA — EXPENSLY
Versión MVP 1.0.0 | 1 de marzo de 2026 | Clasificación: Interna

================================================================================
ÍNDICE
================================================================================

  1. Visión General
  2. Arquitectura del Sistema
  3. Base de Datos
  4. Backend (NestJS)
       4.1  Módulo auth
       4.2  Módulo registro-gastos
       4.3  Infraestructura
       4.4  API REST — Referencia de endpoints
  5. Frontend (Angular)
       5.1  Estructura de la aplicación
       5.2  Rutas y lazy loading
       5.3  Core (guards, interceptores, servicios)
       5.4  Módulos de features
       5.5  Componentes compartidos
  6. Modelo de Seguridad
  7. Flujos de Datos Críticos
  8. Integraciones Externas
  9. Variables de Entorno
 10. Guía de Desarrollo Local


================================================================================
1. VISIÓN GENERAL
================================================================================

Expensly es una plataforma SaaS multi-tenant de gestión empresarial de gastos
orientada al mercado panameño. Su propósito es digitalizar el ciclo completo
de registro, validación y auditoría de facturas dentro de una organización.

Un empleado fotografía una factura desde cualquier dispositivo. El sistema
extrae automáticamente los datos fiscales (proveedor, RUC, DV, fecha, montos,
ITBMS) mediante reconocimiento de códigos QR de la DGI o a través de
Inteligencia Artificial (Azure Document Intelligence). Un administrador o
contador audita, aprueba o rechaza las facturas desde un panel centralizado.

Modelo multi-tenant: una sola instancia sirve a múltiples organizaciones con
aislamiento estructural de datos. Cada entidad en BD lleva organizacion_id, y
los repositorios siempre filtran por ese valor extraído del JWT. Es físicamente
imposible acceder a datos de otra organización.

Stack tecnológico:
  Frontend     Angular 19.2 + TypeScript 5.7 (Standalone Components)
  Backend      NestJS 11.0 + TypeScript 5.7
  ORM          Prisma 6.x
  Base datos   PostgreSQL 15+ (Supabase)
  Auth         JWT + Bcrypt
  Imágenes     Cloudinary CDN
  OCR          Azure Document Intelligence REST API v1.0
  QR (browser) zxing-wasm (WebAssembly)
  Correos      Nodemailer + SMTP
  Exportación  xlsx


================================================================================
2. ARQUITECTURA DEL SISTEMA
================================================================================

  [Browser] ── HTTPS/REST ──► [NestJS Backend] ─┬─► PostgreSQL (Supabase)
      │                             │            ├─► Cloudinary (imágenes)
      │ zxing-wasm (QR)             │            └─► Azure OCR
      │                       Passport JWT              │
      │                       Role Guards          DGI scraping
      │                       Prisma ORM           SMTP (correos)
      │
  Angular 19, Standalone Components, Lazy Loading por feature


================================================================================
3. BASE DE DATOS
================================================================================

Schema definido con Prisma ORM, migraciones versionadas, proveedor PostgreSQL.

Relaciones principales:
  organizaciones ──► usuarios, facturas, categorias, tags, logs_auditoria
  usuarios       ──► facturas (SET NULL al eliminar), sesiones, logs_auditoria
  facturas       ──► factura_imagenes (CASCADE), factura_tags ──► tags (N:N)


TABLAS

organizaciones
  id (UUID PK), razon_social (VARCHAR 255), ruc (VARCHAR 50, UNIQUE),
  dv (VARCHAR 10), plan_suscripcion (default "Trial"), fecha_registro

usuarios
  id (UUID PK), organizacion_id (FK → org, CASCADE delete),
  nombre_completo, email (UNIQUE), password_hash, rol (enum RolUsuario,
  default EMPLEADO), activo (BOOLEAN, default true), reset_token,
  reset_token_expires_at, fecha_creacion

facturas
  id (UUID PK), organizacion_id (FK, CASCADE), usuario_id (FK nullable,
  SET NULL al eliminar usuario), categoria_id (FK nullable),
  nombre_proveedor, ruc_proveedor, dv_proveedor, numero_factura, cufe,
  fecha_emision (DATE), subtotal (DECIMAL 12,2), itbms (DECIMAL 12,2),
  monto_total (DECIMAL 12,2), estado (default "PENDIENTE"),
  motivo_rechazo (TEXT nullable), fecha_subida

factura_imagenes
  id (UUID PK), factura_id (FK, CASCADE), url, imagePublicId, orden (INT)
  Restricción única: (factura_id, orden)

categorias
  id (UUID PK), organizacion_id (FK, CASCADE), nombre (VARCHAR 100),
  codigo_contable (VARCHAR 50 nullable)
  Restricción única: (organizacion_id, nombre)

tags
  id (UUID PK), organizacion_id (FK, CASCADE), nombre (VARCHAR 50),
  color (VARCHAR 7, default "#000000")

factura_tags — tabla N:N
  PK compuesta: (factura_id, tag_id). CASCADE en ambas FK.

sesiones
  id (UUID PK), usuario_id (FK, CASCADE), token_id (VARCHAR 255),
  expira_en, creado_en

logs_auditoria
  id (UUID PK), organizacion_id (FK, NO ACTION), usuario_id (FK nullable,
  SET NULL), accion (VARCHAR 100), detalle (JSON nullable), fecha


ENUMERACIONES

  RolUsuario:    SUPERADMIN | CONTADOR | EMPLEADO
  EstadoFactura: PENDIENTE  | APROBADO | RECHAZADO


POLÍTICAS DE ELIMINACIÓN REFERENCIAL

  organizaciones → usuarios         CASCADE
  organizaciones → facturas         CASCADE
  usuarios       → facturas         SET NULL  (facturas se preservan para auditoría)
  usuarios       → logs_auditoria   SET NULL  (historial se conserva)
  facturas       → factura_imagenes CASCADE


================================================================================
4. BACKEND (NestJS)
================================================================================

Arquitectura modular. Cada módulo encapsula controladores, servicios,
repositorios, DTOs, entidades y guards.

src/
  main.ts              Bootstrap (puerto, CORS, ValidationPipe global)
  app.module.ts        Módulo raíz
  prisma/              PrismaModule + PrismaService (global)
  modules/
    auth/              Autenticación y gestión de usuarios
    registro-gastos/   Facturas, OCR, CRUD y exportación
  infrastructure/
    mail/              Nodemailer (correos transaccionales)
    ocr/               Azure Document Intelligence
    storage/           Cloudinary
    tasks/             Tareas programadas (limpieza de tokens expirados)


4.1 MÓDULO AUTH
---------------
Gestiona el ciclo de vida de identidad: onboarding, login, recuperación de
contraseña, gestión de usuarios e invitaciones.

Archivos principales:
  auth.controller.ts     Todos los endpoints bajo /auth
  auth.service.ts        Login, logout, invitación, cambio de roles, activación
  onboarding.service.ts  Creación atómica (prisma.$transaction) de org + SUPERADMIN
  auth.repository.ts     Consultas Prisma de usuarios y organizaciones
  jwt.guard.ts           Valida JWT, adjunta payload al request
  roles.guard.ts         Verifica @Roles() contra el rol del JWT
  jwt.strategy.ts        Configuración Passport-JWT
  @Roles() decorator     Metadata de roles requeridos por endpoint
  @CurrentUser()         Extrae payload del request en parámetros de método
  Entities               UserEntity, OrganizationEntity, AuthResponseEntity
                         (ocultan password_hash via @Exclude de class-transformer)

Flujo de onboarding:
  1. Valida DTO (razón social, RUC, DV, email, contraseña)
  2. Verifica unicidad del email → 409 Conflict si ya existe
  3. prisma.$transaction([createOrganizacion, createUsuario(SUPERADMIN)])
     Si cualquier paso falla → rollback completo
  4. Genera JWT firmado → retorna { organization, authData }

Flujo de login:
  1. Busca usuario por email → 401 genérico si no existe (anti-enumeración)
  2. activo === false → 403 "Cuenta desactivada"
  3. bcrypt.compare(password, hash) → 401 genérico si no coincide
  4. Registra sesión en tabla `sesiones`
  5. Retorna JWT firmado + datos del usuario

Recuperación de contraseña:
  forgot-password: genera token de 32 bytes aleatorios, lo hashea con bcrypt,
    lo guarda con TTL de 60 minutos. Envía correo con link. Siempre retorna el
    mismo mensaje independientemente de si el email existe (anti-enumeración).
  reset-password: verifica token contra hash almacenado, actualiza contraseña e
    invalida el token en la misma transacción (uso único, no reutilizable).


4.2 MÓDULO REGISTRO-GASTOS
---------------------------
Gestiona el ciclo completo de facturas: procesamiento QR/OCR, CRUD, auditoría
y exportación.

Archivos principales:
  registro-gastos.controller.ts  Endpoints de facturas
  categoria.controller.ts        CRUD de categorías
  registro-gastos.service.ts     Orquesta procesamiento y persistencia
  registro-gastos.repository.ts  Consultas Prisma filtradas por organizacion_id
  factura-procesar.strategy.ts   Pipeline QR → DGI → OCR (Strategy Pattern)
  export-strategy.interface.ts   Interfaz de exportación desacoplada
  factura.entity.ts              Serialización de respuesta de facturas

Pipeline de procesamiento (POST /registro-gastos/procesar-factura):
  Validación: imágenes tipo JPG/PNG/WEBP, máx 5MB cada una, máx 10 archivos.
  Paso 1 — ¿Se recibió clientQrData (QR decodificado en browser)?
    SÍ → Scraping a DGI → si QR válido, retorna datos oficiales DGI
    NO / DGI falla → continúa al Paso 2
  Paso 2 — Azure OCR:
    Extrae texto de cada imagen individualmente (soporte multi-página).
    Concatena todos los textos y parsea con parseDgiPanama() (regex para DGI).
    Parsea también cada imagen por separado.
    Merge inteligente por campo: elige el valor más largo y no vacío.
    Retorna resultado final mergeado.

Patrón Repository (aislamiento multi-tenant):
  Todos los métodos reciben organizacion_id como parámetro obligatorio y lo
  inyectan en el WHERE de cada consulta. Este valor NUNCA proviene del body
  del request — siempre se extrae del payload JWT validado por el guard.

  Ejemplo:
    async getFacturaById(id: string, organizacionId: string) {
      return this.prisma.facturas.findFirst({
        where: { id, organizacion_id: organizacionId },
        include: { imagenes: true, categorias: true }
      });
    }


4.3 INFRAESTRUCTURA
--------------------
AzureOcrService (infrastructure/ocr/)
  Modelo: prebuilt-read. Más flexible que prebuilt-invoice para el formato DGI.
  Combina texto de múltiples imágenes antes de parsear. Merge de resultados
  por imagen para el campo más preciso. Campos extraídos: nombre proveedor,
  RUC, DV, N° factura, CUFE, fecha, subtotal, ITBMS, total.

CloudinaryService (infrastructure/storage/)
  Implementa StorageInterface (desacoplado, fácil sustitución de proveedor).
  uploadFile(buffer, folder) → { url, publicId }.
  Las imágenes se suben ANTES de crear el registro en BD. Si Cloudinary falla,
  no se persiste ninguna factura.

MailService (infrastructure/mail/)
  Nodemailer + SMTP. Configurado con SMTP_HOST/PORT/USER/PASS.
  Correos: recuperación de contraseña (link de 60 min) e invitación (pass temp).
  Los fallos de envío se capturan en logs pero no interrumpen el flujo.


4.4 API REST — REFERENCIA DE ENDPOINTS
----------------------------------------
Todos los endpoints protegidos requieren: Authorization: Bearer <JWT>

/auth
  POST   /auth/onboarding           Público      Registrar empresa + admin
  POST   /auth/login                Público      Iniciar sesión
  POST   /auth/logout               Auth         Cerrar sesión
  GET    /auth/me                   Auth         Perfil del usuario autenticado
  PATCH  /auth/change-password      Auth         Cambiar contraseña propia
  POST   /auth/forgot-password      Público      Solicitar reset de contraseña
  POST   /auth/reset-password       Público      Aplicar nueva contraseña con token
  GET    /auth/users                SUPERADMIN   Listar usuarios de la organización
  POST   /auth/invite               SUPERADMIN   Invitar usuario por email
  PATCH  /auth/users/:id/status     SUPERADMIN   Activar / desactivar usuario
  PATCH  /auth/users/:id/role       SUPERADMIN   Cambiar rol de usuario
  DELETE /auth/users/:id            SUPERADMIN   Eliminar usuario

/registro-gastos
  POST   /registro-gastos/procesar-factura  Auth            Procesar imágenes QR/OCR
  GET    /registro-gastos                   CONT/SADMIN     Todas las facturas de la org
  GET    /registro-gastos/mis-facturas      Auth            Facturas del usuario actual
  GET    /registro-gastos/:id               Auth            Detalle de una factura
  POST   /registro-gastos                   Auth            Guardar factura procesada
  PUT    /registro-gastos/:id               Auth            Actualizar factura
  PATCH  /registro-gastos/:id/estado        CONT/SADMIN     Aprobar o rechazar
  DELETE /registro-gastos/:id               Auth            Eliminar factura
  POST   /registro-gastos/export            CONT/SADMIN     Exportar listado a Excel

/categorias
  GET    /categorias        Auth          Listar categorías de la organización
  POST   /categorias        CONT/SADMIN   Crear categoría
  PUT    /categorias/:id    CONT/SADMIN   Actualizar categoría
  DELETE /categorias/:id    CONT/SADMIN   Eliminar categoría


================================================================================
5. FRONTEND (ANGULAR)
================================================================================

Angular 19, exclusivamente Standalone Components (sin NgModules). Lazy loading
por feature para reducir el bundle inicial.


5.1 ESTRUCTURA DE LA APLICACIÓN
---------------------------------
src/app/
  app.component.*      Shell raíz: <router-outlet> + <app-toast>
  app.config.ts        provideRouter, provideHttpClient, withInterceptors
  app.routes.ts        Rutas raíz con lazy loading
  core/
    guards/            auth.guard.ts, role.guard.ts
    interceptors/      jwt.interceptor.ts
    models/            roles.enum.ts
    services/          qr-scanner.service.ts
  features/
    auth/              Login, onboarding, recuperación de contraseña
    registro-factura/  Carga y vista de facturas (empleado)
    admin/             Panel de auditoría y gestión de usuarios
  shared/
    button/            <app-button>
    input/             <app-input>
    modal/             <app-modal> — shell genérico para todos los diálogos
    navbar/            <app-navbar>
    sidebar/           <app-sidebar>
    toast/             <app-toast> + ToastService
    factura-view/      Visor sticky con lightbox
    invoice-audit-modal/ Modal de detalle y auditoría de factura
    not-found/         Página 404 personalizada
    validators/        Validadores reactivos reutilizables


5.2 RUTAS Y LAZY LOADING
--------------------------
  /auth/**      authRoutes             Público (sin guards)
  /facturas/**  registroFacturaRoutes  authGuard + roleGuard([EMPLEADO])
  /admin/**     adminRoutes            authGuard + roleGuard([SUPERADMIN, CONTADOR])
  /             → redirect a /auth/login
  /**           → NotFoundComponent (404)

Cada módulo declara sus sub-rutas en *.routes.ts y se carga con loadChildren().

  /auth:       login, onboarding (wizard 2 pasos), forgot-password, reset-password
  /facturas:   cargar, mis-facturas
  /admin:      facturas, usuarios


5.3 CORE
----------
authGuard (CanActivateFn)
  Verifica existencia y vigencia del token en localStorage. Token expirado →
  logout automático + redirect a /auth/login.

roleGuard (factory: roleGuard([Role.SUPERADMIN, ...]))
  Decodifica el payload JWT localmente sin petición al backend. Verifica rol
  del usuario contra lista de roles permitidos de la ruta. Si no coincide,
  redirige al home del rol actual.
  Lógica: split por '.', atob(parte central), JSON.parse, exp*1000 vs Date.now().

jwtInterceptor (HttpInterceptorFn)
  Clona cada request HTTP saliente y agrega Authorization: Bearer <token>
  si hay token en localStorage.

QrScannerService
  Wrapper de zxing-wasm. Decodifica QR en WebAssembly en el browser del usuario.
  Sin costo de red ni API externa.


5.4 MÓDULOS DE FEATURES
-------------------------
AUTH
  LoginComponent: formulario reactivo, maneja 401/403, redirige según rol del JWT.
  OnboardingComponent: wizard orquestador con router-outlet para pasos hijo.
    Paso 1 (OnboardingPaso1Component): razón social, RUC, DV.
    Paso 2 (OnboardingPaso2Component): nombre, email, contraseña. Emite
    @Output() submitData al padre, que ejecuta el POST final a /auth/onboarding.
  ForgotPasswordComponent / ResetPasswordComponent: flujo de dos pasos.
    ResetPasswordComponent lee el token desde queryParams de la URL.
  AuthService: login(), logout(), getToken(), saveSession(), isAuthenticated().
  OnboardingService: acumula datos de ambos pasos, ejecuta POST /auth/onboarding.

REGISTRO-FACTURA
  CargarFacturaPage orquesta tres sub-componentes:
    CargarArchivoComponent    drag-and-drop, ejecuta QrScannerService, envía
                              imágenes + QR al backend. Método público reset()
                              invocado por @ViewChild al pulsar "Descartar todo".
    FacturaFormComponent      formulario reactivo editable con datos del OCR,
                              selector de categoría, botón de guardado.
    FacturaViewComponent      visor sticky. Emite @Output lightboxChange(boolean)
                              para que el padre eleve el z-index al activar el
                              lightbox (z-index 1 normal → 1001 lightbox activo).
  MisFacturasPage: tabla paginada de facturas propias. Estado visual por color.
  Tooltip con motivo de rechazo en facturas rechazadas (ícono ⓘ).

ADMIN
  AdminFacturasPage:
    InvoiceFilterComponent    filtros combinados: estado, rango de fechas,
                              categoría, empleado
    InvoiceListComponent      tabla paginada en servidor, selección múltiple
    InvoiceAuditModal         carrusel de imágenes + todos los campos,
                              acciones: aprobar / rechazar con motivo
    ExportExcelCsvComponent   exportación con filtros aplicados

  AdminUsuariosPage:
    UserTableComponent        tabla con avatar, rol, estado, menú contextual ⋯
    UserInviteModal           email (req.), nombre (opc., default: parte local
                              del email), rol
    UserActionModal           confirmación para cambio de rol / activar / eliminar
    UserRoleGuideComponent    descripción visual de los tres roles disponibles


5.5 COMPONENTES COMPARTIDOS
-----------------------------
<app-modal>
  Shell genérico para todos los diálogos. Único origen de verdad del diseño
  modal. @Input: title, variant (default|info|success|warning|danger),
  size (sm|md|lg), isOpen. Slots ng-content: [modal-icon], [modal-body],
  [modal-footer]. Cierra con Escape o clic en backdrop. Emite evento (closed).

<app-toast>
  Notificaciones no bloqueantes globales montadas en AppComponent.
  API: toastService.success/error/warning/info(title, message?, durationMs?)
  Animación bounce desde la derecha (cubic-bezier). Barra de progreso en base.
  z-index 11000 — visible sobre cualquier modal o capa de la interfaz.
  Duración por defecto: 4 segundos.

<app-factura-view>
  z-index 1 en estado normal (debajo del navbar). Al activar el lightbox emite
  lightboxChange(true) y el padre aplica clase viewer--lightbox → z-index 1001.

<app-navbar>
  Barra responsive con nombre, rol y menú desplegable (logout).
  z-index dinámico coordinado con el visor de facturas para no solaparse.


================================================================================
6. MODELO DE SEGURIDAD
================================================================================

ROLES Y PERMISOS

  Acción                                    EMPLEADO  CONTADOR  SUPERADMIN
  ---------------------------------------------------------------------------
  Registrar / ver facturas propias             SI        SI        SI
  Ver todas las facturas de la organización    NO        SI        SI
  Aprobar / rechazar facturas                  NO        SI        SI
  Exportar a Excel                             NO        SI        SI
  Gestionar usuarios (todo)                    NO        NO        SI


CAPAS DE PROTECCIÓN (defensa en profundidad)

  1. roleGuard (frontend)
     Bloquea la navegación antes de renderizar cualquier componente.
     Redirige al home correcto según el rol actual del usuario.

  2. jwtInterceptor (frontend)
     Adjunta el token a todas las peticiones. Si el backend retorna 401
     (token expirado en mitad de sesión), AuthService fuerza el logout.

  3. JwtAuthGuard (backend)
     Valida la firma criptográfica del JWT en cada request protegido.
     Token inválido o expirado → 401 Unauthorized.

  4. RolesGuard (backend)
     Compara el rol del payload JWT con los roles declarados en @Roles().
     Rol insuficiente → 403 Forbidden.

  5. Repository — aislamiento por organizacion_id (backend)
     Toda consulta a BD incluye organizacion_id extraído del JWT. Conocer
     el UUID de un recurso de otra organización retorna 404, nunca el dato.

  6. Reglas de negocio en el servicio (backend)
     Usuario no puede eliminar su propia cuenta.
     No se puede eliminar al último administrador de la organización.
     SUPERADMIN no puede ser degradado por un rol inferior.
     Tokens de reset-password se invalidan inmediatamente después de su uso.


ESTRUCTURA DEL JWT

  {
    "sub":            "uuid-del-usuario",
    "email":          "usuario@empresa.com",
    "role":           "SUPERADMIN",
    "organizationId": "uuid-de-la-organizacion",
    "iat":            1740000000,
    "exp":            1740086400   (24 horas de vigencia)
  }


================================================================================
7. FLUJOS DE DATOS CRÍTICOS
================================================================================

REGISTRO DE FACTURA
  1. Browser: usuario arrastra imagen(s).
  2. QrScannerService decodifica QR en WebAssembly (costo cero).
  3. POST /procesar-factura { files[], clientQrData? }
  4. Backend: ¿clientQrData? → scraping DGI → datos oficiales.
             Sin QR / DGI falla → Azure OCR → parseDgiPanama() → merge.
  5. Browser: formulario pre-completado. Empleado revisa y corrige.
  6. POST /registro-gastos { datos del formulario }
  7. Backend: upload imágenes a Cloudinary → { url, publicId }.
  8. Backend: prisma.facturas.create + prisma.factura_imagenes.createMany.
  9. Browser: toast de éxito. Factura queda en estado PENDIENTE.

AUDITORÍA DE FACTURA
  1. Admin obtiene listado paginado con filtros.
  2. Clic en fila → InvoiceAuditModal (imágenes + datos completos).
  3. PATCH /registro-gastos/:id/estado { estado, motivoRechazo? }
  4. RolesGuard verifica CONTADOR o SUPERADMIN.
  5. Repository.updateEstado(id, organizacionId) — filtro multi-tenant.
  6. Browser: toast de confirmación + recarga de tabla.

INVITACIÓN DE USUARIO
  1. POST /auth/invite { email, nombre?, rol }
  2. RolesGuard verifica SUPERADMIN.
  3. Service: genera contraseña temporal → bcrypt.hash → prisma.create.
  4. MailService.sendInvitation(email, tempPassword).
  5. Response 201 { user, tempPassword }. Browser: toast.


================================================================================
8. INTEGRACIONES EXTERNAS
================================================================================

Azure Document Intelligence
  Modelo: prebuilt-read (más flexible para el formato DGI panameño que el
  modelo prebuilt-invoice). Auth: API Key en header. Variables requeridas:
  AZURE_OCR_ENDPOINT, AZURE_OCR_KEY. Si falla → excepción capturada → 500
  con mensaje descriptivo al frontend.

Cloudinary
  Clase CloudinaryService implementa StorageInterface (desacoplado).
  Variables: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.
  Carpetas: /expensly/{organizacion_id}/. Imágenes se suben ANTES de persistir
  la factura en BD. Si Cloudinary falla, no se crea ningún registro.

DGI Panamá (web scraping)
  HTTP fetch al portal DGI con el CUFE extraído del QR.
  Costo: cero. Fuente oficial certificada.
  Fallback automático a Azure OCR si DGI no responde. El usuario no percibe
  el error interno.

Nodemailer + SMTP
  Compatible con cualquier proveedor estándar (Gmail, SendGrid, Mailgun...).
  Correos enviados: recuperación de contraseña (link TTL 60 min) e invitaciones
  (con contraseña temporal). Fallos de envío: capturados en logs, no
  interrumpen el flujo principal (la cuenta se crea igualmente).

zxing-wasm (browser)
  WebAssembly ejecutado en el cliente, sin costo de API y sin latencia de red.
  Retorna el texto crudo del QR (URL del portal DGI con el CUFE).


================================================================================
9. VARIABLES DE ENTORNO
================================================================================

backend/.env
  DATABASE_URL          = postgresql://user:pass@host:5432/expensly
  JWT_SECRET            = <clave secreta larga y aleatoria>
  JWT_EXPIRATION        = 24h
  AZURE_OCR_ENDPOINT    = https://tu-recurso.cognitiveservices.azure.com/
  AZURE_OCR_KEY         = <api key de azure>
  CLOUDINARY_CLOUD_NAME = <cloud name>
  CLOUDINARY_API_KEY    = <api key>
  CLOUDINARY_API_SECRET = <api secret>
  SMTP_HOST             = smtp.gmail.com
  SMTP_PORT             = 587
  SMTP_USER             = correo@empresa.com
  SMTP_PASS             = <contraseña de aplicación>
  SMTP_FROM             = Expensly <noreply@expensly.app>
  PORT                  = 3000
  FRONTEND_URL          = http://localhost:4200

frontend/src/environments/environment.ts      production: false, apiUrl: http://localhost:3000
frontend/src/environments/environment.prod.ts production: true,  apiUrl: https://api.expensly.app


================================================================================
10. GUÍA DE DESARROLLO LOCAL
================================================================================

Prerrequisitos:
  Node.js 20+, npm 10+, PostgreSQL 15+ (o cuenta Supabase)
  npm install -g @angular/cli @nestjs/cli

Levantar el backend:
  cd backend
  npm install
  cp .env.example .env          # editar con credenciales reales
  npx prisma migrate dev        # ejecutar todas las migraciones
  npm run prisma:generate       # genera cliente Prisma + ejecuta fix-generated.js
  nest start --watch            # servidor en http://localhost:3000

Levantar el frontend:
  cd frontend
  npm install
  ng serve                      # aplicación en http://localhost:4200

Comandos de utilidad:
  npx prisma studio                          Explorador visual de BD en browser
  npx prisma migrate dev --name <nombre>     Crear y aplicar nueva migración
  npm run prisma:generate                    Regenerar cliente Prisma
  ng build --configuration production        Build optimizado para producción
  nest build                                 Compilar TypeScript del backend

Migraciones ejecutadas:
  20260219215105_init                  Esquema inicial (todas las tablas)
  20260221195709_tabla_imgs_factura    Nueva tabla factura_imagenes
  20260225184055_add_dv_proveedor      Campo dv_proveedor en facturas
  20260225204250_add_subtotal          Campo subtotal en facturas


================================================================================
Documentación preparada por el equipo de desarrollo de Expensly.
MVP 1.0.0 — Rama main — 1 de marzo de 2026
================================================================================
