# Expensly — Frontend

Aplicación de página única (SPA) construida con **Angular 19** en modo standalone. Implementa la interfaz de usuario para el sistema de gestión de gastos empresariales Expensly.

---

## Decisiones de arquitectura

### ¿Por qué Angular 19 con componentes standalone?

Angular 17+ introdujo los componentes standalone como el modo recomendado, eliminando la necesidad de `NgModule`. Esta decisión reduce la superficie de configuración, hace que cada componente sea explícito sobre sus dependencias y mejora el tree-shaking del compilador, produciendo bundles más pequeños en producción.

### Estructura de carpetas

```
src/app/
├── core/
│   ├── guards/              # RoleGuard, AuthGuard — protección de rutas por JWT
│   └── services/            # QrScannerService — lógica de escaneo de QR con zxing-wasm
├── features/
│   ├── auth/                # Login, registro, reset de contraseña, onboarding empresa
│   ├── admin/               # Panel de administrador: gestión de facturas y usuarios
│   └── registro-factura/    # Subida, procesamiento OCR y visualización de facturas
└── shared/
    ├── modal/               # Componente genérico <app-modal> con variantes y slots
    ├── toast/               # Sistema de notificaciones emergentes con barra de progreso
    ├── factura-view/        # Visor de imágenes con lightbox para facturas
    └── not-found/           # Página 404 personalizada
```

La carpeta `core/` contiene lógica transversal que no pertenece a ningún feature específico. La carpeta `shared/` contiene componentes reutilizables sin estado de negocio. Los `features/` son módulos de dominio aislados que importan únicamente lo que necesitan.

---

## Módulos principales

### `auth`
Gestiona todo el flujo de autenticación:
- `login` — Formulario reactivo con validación, manejo de errores del backend
- `register` — Creación de cuenta de usuario inicial
- `onboarding` — Wizard de dos pasos para registrar la empresa (razón social, RUC, DV). Al completarse muestra un modal de éxito y redirige al panel
- `reset-password` — Cambio de contraseña vía token enviado por email (token de un solo uso, expira en 1 hora)

### `registro-factura`
Flujo completo de subida y guardado de facturas:
- `cargar-archivo` — Zona de drag-and-drop con previsualización de imágenes. Valida tipo MIME y tamaño máximo (5 MB por imagen, hasta 10 imágenes)
- `factura-form` — Formulario de edición de los datos extraídos por OCR. El usuario puede corregir cualquier campo antes de confirmar
- `factura-view` — Visor sticky del lado derecho con soporte de lightbox. Usa `z-index` dinámico: se eleva a `1001` solo cuando el lightbox está abierto, evitando que cubra el navbar durante el scroll
- `mis-facturas` — Lista paginada de las facturas del usuario autenticado

### `admin`
Panel de gestión exclusivo para roles `CONTADOR` y `SUPERADMIN`:
- `facturas` — Tabla con toolbar de filtros, selección múltiple, exportación a Excel. Modal de auditoría para aprobar/rechazar con motivo
- `admin-usuarios` — CRUD completo de usuarios de la organización. Incluye invitación por email, cambio de rol y borrado con protecciones de seguridad

---

## Sistema de diseño interno

### `<app-modal>` (shared/modal)

Componente genérico que encapsula toda la lógica y estilos de los modales de la aplicación. Recibe contenido mediante slots con `ng-content`:

```html
<app-modal
  [visible]="visible"
  title="Título"
  subtitle="Subtítulo"
  variant="danger"      <!-- default | info | success | warning | danger -->
  size="sm"             <!-- sm | md | lg -->
  [blockBackdrop]="true"
  (closed)="onCerrar()"
>
  <div modal-body>       <!-- Contenido del cuerpo --></div>
  <div modal-icon>       <!-- Icono personalizado (opcional) --></div>
  <ng-container modal-footer>  <!-- Botones de acción --></ng-container>
</app-modal>
```

**¿Por qué un componente genérico?** Antes de este refactor, cada modal duplicaba su propio backdrop, animaciones y estilos de header. El componente genérico reduce el CSS total en ~60% y garantiza consistencia visual: 5 variantes de color, 3 tamaños, animación de entrada (`cubic-bezier` bounce), cierre por ESC y click fuera.

### `<app-toast>` (shared/toast)

Sistema de notificaciones no intrusivo con:
- Slide desde la derecha con bounce (coincide con el motion design general)
- Barra de progreso animada con `animation-duration` dinámico (`durationMs` por toast)
- `z-index: 11000` — siempre visible sobre modales y lightboxes
- Variantes: `success`, `error`, `warning`, `info`
- Tipografía Quicksand para consistencia con el resto de la UI

---

## Procesamiento QR en el cliente

Antes de enviar las imágenes al backend, el `QrScannerService` intenta decodificar el código QR directamente en el browser usando **zxing-wasm** (WebAssembly). El binario `.wasm` se copia a `public/assets/` automáticamente por el script `postinstall` de npm.

**Ventaja:** si el QR se decodifica en el cliente, el backend puede consultar DGI directamente sin invocar Azure OCR. En facturas con QR visible, el costo de procesamiento es cero.

```typescript
// core/services/qr-scanner.service.ts
const qr = await this.qrScannerService.scanFiles(archivos);
if (qr) {
  // Enviar clientQrData al backend → backend verifica con DGI
} else {
  // Backend usa Azure Document Intelligence como fallback
}
```

---

## Guards y control de acceso

```typescript
// Rutas protegidas con roles
{ path: 'admin', canActivate: [RoleGuard], data: { roles: ['CONTADOR', 'SUPERADMIN'] } }
{ path: 'facturas', canActivate: [RoleGuard], data: { roles: ['EMPLEADO', 'CONTADOR'] } }
```

`RoleGuard` decodifica el payload del JWT almacenado en `localStorage` sin hacer una petición al backend. Verifica:
1. Existencia del token
2. No expiración (`exp` del payload vs `Date.now()`)
3. Rol autorizado para la ruta

Si alguna verificación falla, redirige a `/auth/login`. Si el token es válido pero el rol no coincide con la ruta solicitada, redirige a la ruta correcta según el rol (`getHomeByRole`).

---

## Variables de entorno

El frontend no tiene variables de entorno en producción — todos los endpoints del backend se configuran en `src/environments/`:

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000'
};
```

---

## Comandos disponibles

```bash
# Instalar dependencias (también copia el .wasm de zxing)
npm install

# Servidor de desarrollo (hot reload)
npm start
# Disponible en http://localhost:4200

# Build de producción
npm run build
# Artefactos en dist/frontend/

# Build en modo watch (desarrollo)
npm run watch

# Tests unitarios con Karma
npm test
```

---

## Requisitos

- Node.js ≥ 20
- npm ≥ 10
- El backend debe estar corriendo en `http://localhost:3000` (o configurar `environment.ts`)

---

## Notas importantes

- **zxing-wasm**: el archivo `zxing_reader.wasm` debe estar en `public/assets/`. Se copia automáticamente en `postinstall`. Si no está presente, el escaneo QR fallará silenciosamente y el backend usará OCR como fallback.
- **Fuente Quicksand**: se carga desde Google Fonts en `index.html`. Sin conexión a internet, se usa la fuente del sistema como fallback sin romper el layout.
- **Standalone components**: ningún `NgModule` custom — cada componente declara explícitamente sus imports.

