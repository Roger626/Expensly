# Expensly

> Plataforma empresarial de gestión de gastos con extracción inteligente de facturas mediante IA y reconocimiento de códigos QR.

---

## Descripción general

Expensly es una aplicación SaaS multi-tenant diseñada para que empresas panameñas registren, validen y auditen sus facturas de forma automatizada. El empleado sube una imagen de su factura; el sistema detecta el código QR de la DGI (Dirección General de Ingresos) en el frontend, lo verifica con el backend, y —si existe— realiza web scraping directo a DGI para obtener los datos sin costo de OCR. Si no hay QR, el backend delega en Azure Document Intelligence para extraer los campos mediante IA. El administrador revisa, aprueba o rechaza las facturas desde un panel dedicado.

---

## Arquitectura general

```
Expensly/
├── frontend/          Angular 19 — SPA con lazy loading por módulo
├── backend/           NestJS 11 — API REST con arquitectura modular
```

El proyecto sigue una **separación estricta de capas**: el frontend nunca accede a la base de datos directamente, toda la lógica de negocio reside en el backend, y el frontend consume únicamente endpoints REST autenticados con JWT.

---

## Stack tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| Frontend | Angular 19 + TypeScript | Tipado estricto, componentes standalone, excelente tooling para SPAs empresariales |
| Backend | NestJS 11 + TypeScript | Inyección de dependencias nativa, módulos aislados, integración natural con Prisma |
| ORM | Prisma 6 | Migraciones declarativas, tipos generados automáticamente, soporte PostgreSQL |
| Base de datos | PostgreSQL (Supabase) | ACID compliant, soporte UUID nativo, foreign keys con `onDelete` explícito |
| Almacenamiento | Cloudinary | CDN global, transformaciones de imagen on-the-fly, URLs permanentes para facturas |
| OCR / IA | Azure Document Intelligence | Extracción de campos estructurados en facturas con alta precisión |
| QR Scanning | zxing-wasm (cliente) | Decodificación en el browser sin costo de servidor, GPU del usuario |
| Auth | JWT (access token) + Bcrypt | Stateless, escalable; bcrypt con salt rounds para passwords seguros |
| Email | Nodemailer + Handlebars | Reset de contraseña con tokens firmados de un solo uso |
| Exportación | xlsx | Descarga de reportes Excel sin dependencias nativas |

---

## Modelo de datos

El esquema está diseñado con aislamiento multi-tenant por `organizacion_id`. **Ninguna tabla expone datos entre organizaciones**: todos los queries del backend siempre filtran por el `organizacion_id` extraído del JWT, nunca del body.

```
organizaciones
  ├── usuarios         (rol: SUPERADMIN | CONTADOR | EMPLEADO)
  ├── categorias       (únicas por organización)
  ├── tags
  ├── facturas
  │     ├── factura_imagenes  (múltiples imágenes por factura, ordenadas)
  │     └── factura_tags
  └── logs_auditoria
```

**Decisiones de diseño relevantes:**
- `usuario_id` en `facturas` es **nullable** (`onDelete: SetNull`): si se elimina un usuario, sus facturas quedan huérfanas pero no se pierden — crítico para auditoría contable.
- `organizacion_id` usa `onDelete: Cascade`: eliminar una organización elimina toda su data. Esto es intencional para cumplimiento de GDPR/datos.
- `sesiones` almacena el `token_id` (JTI) para poder invalidar tokens específicos sin rotar el secret.
- `estado` en facturas tiene valores `PENDIENTE | APROBADO | RECHAZADO` — también modelado como enum en Prisma pero almacenado como `VarChar` para compatibilidad con constraints SQL existentes.

---

## Flujo de procesamiento de facturas

```
[Usuario sube imagen]
        │
        ▼
[Cliente: zxing-wasm escanea QR]  ── QR encontrado ──▶  [Backend verifica QR con DGI]
        │                                                         │
        │ Sin QR                                    QR válido ◀──┘
        ▼                                                │
[Backend: Azure OCR]              ◀── QR inválido ◀────┘
        │
        ▼
[Campos extraídos devueltos al frontend]
        │
        ▼
[Usuario edita, confirma y guarda]
        │
        ▼
[Backend: crea factura + sube imagen a Cloudinary]
```

Este diseño de **doble verificación** evita cobros innecesarios a Azure: si el QR es legible y DGI responde, el OCR nunca se invoca. En producción, esto representa un ahorro significativo dado el volumen de facturas esperado.

---

## Módulos de la aplicación

| Módulo | Roles | Descripción |
|---|---|---|
| **Auth** | Todos | Registro de empresa, login, reset de contraseña por email |
| **Registro Factura** | EMPLEADO, CONTADOR | Subida, procesamiento OCR/QR y guardado de facturas |
| **Ver Facturas** | EMPLEADO, CONTADOR | Lista paginada y filtrada de las propias facturas |
| **Admin — Facturas** | CONTADOR, SUPERADMIN | Auditoría, aprobación/rechazo, exportación Excel |
| **Admin — Usuarios** | SUPERADMIN | CRUD de usuarios, asignación de roles, invitaciones por email |

---

## Seguridad

- **Guards por rol**: `RoleGuard` decodifica el JWT en cada request y compara con los roles requeridos por el endpoint.
- **Aislamiento multi-tenant**: el `organizacion_id` del JWT sobreescribe cualquier valor enviado en el body — un usuario no puede manipular facturas de otra organización aunque conozca los IDs.
- **Protección de privilegios**: un admin no puede eliminarse a sí mismo ni eliminar a otro admin. Un SUPERADMIN no puede ser degradado por un CONTADOR.
- **Reset de contraseña**: token UUID4 firmado, almacenado hasheado, con ventana de expiración de 1 hora y eliminado tras su primer uso.
- **Sesiones invalidables**: el JTI del token se almacena en `sesiones`; el guard puede verificar si el token fue revocado antes de que expire.

---

## Requisitos del sistema

- Node.js ≥ 20
- npm ≥ 10
- PostgreSQL ≥ 15 (o acceso a Supabase)
- Variables de entorno configuradas (ver sección de cada sub-proyecto)

---

## Instalación rápida

```bash
# 1. Clonar el repositorio
git clone https://github.com/Roger626/Expensly.git
cd Expensly

# 2. Instalar dependencias de ambos proyectos
cd backend && npm install
cd ../frontend && npm install

# 3. Configurar variables de entorno
cp backend/.env.example backend/.env  # Editar con tus credenciales

# 4. Ejecutar migraciones
cd backend && npx prisma migrate deploy

# 5. Levantar en desarrollo (dos terminales)
# Terminal 1:
cd backend && npm run start:dev

# Terminal 2:
cd frontend && npm start
```

El frontend estará disponible en `http://localhost:4200` y el backend en `http://localhost:3000`.

---

## Estado del proyecto

**MVP 1.0.0** — Estable en rama `main`

| Área | Estado |
|---|---|
| Autenticación y autorización | ✅ Completo |
| Procesamiento OCR + QR | ✅ Completo |
| Gestión de facturas (empleado) | ✅ Completo |
| Panel de auditoría (admin) | ✅ Completo |
| Gestión de usuarios | ✅ Completo |
| Exportación Excel | ✅ Completo |
| Dashboard con gráficas | 🔲 Pendiente |
| Notificaciones en tiempo real | 🔲 Pendiente |
| Reportes PDF | 🔲 Pendiente |
| Tests automatizados (E2E) | 🔲 Pendiente |

---

## Licencia

Proyecto privado — todos los derechos reservados.
