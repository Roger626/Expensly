
# INFORME TÉCNICO — EXPENSLY
## Desarrollo, Pruebas y Optimización del MVP v1.0.0

---

**Proyecto:** Expensly — Sistema Empresarial de Gestión de Gastos
**Versión del documento:** 1.0
**Fecha de emisión:** 1 de marzo de 2026
**Estado del proyecto:** MVP Estable — Rama `main`
**Clasificación:** Documento Técnico Interno

---

## TABLA DE CONTENIDOS

1. Descripción General del Producto
2. Evolución del Proyecto
3. Informe de Pruebas
   - 3.1 Pruebas Funcionales
   - 3.2 Pruebas de Validación de Datos
   - 3.3 Pruebas de Manejo de Errores
4. Optimizaciones Realizadas al Software
   - 4.1 Optimizaciones en el Backend
   - 4.2 Optimizaciones en el Frontend
5. Informe del MVP Funcional — Módulos Clave
6. Conclusiones y Próximos Pasos

---

## 1. DESCRIPCIÓN GENERAL DEL PRODUCTO

Expensly es una plataforma SaaS (Software as a Service) de gestión empresarial de gastos, diseñada específicamente para el mercado panameño. Su propósito es digitalizar y automatizar el ciclo completo de registro, validación y auditoría de facturas dentro de una organización.

La plataforma elimina el proceso manual de digitación de datos al emplear Inteligencia Artificial (Azure Document Intelligence) y reconocimiento de códigos QR de la Dirección General de Ingresos (DGI) para extraer automáticamente los campos de cualquier factura, ya sea en formato físico fotografiado o en formato digital. Los empleados suben sus comprobantes desde cualquier dispositivo, y los administradores los auditan, aprueban o rechazan desde un panel de control centralizado.

El sistema está construido bajo una arquitectura multi-tenant, lo que significa que una sola instancia del software sirve a múltiples organizaciones de forma completamente aislada: ningún dato de una empresa es visible ni accesible para otra.

---

## 2. EVOLUCIÓN DEL PROYECTO

### Fase 1 — Núcleo del sistema (Infraestructura base)

El proyecto inició con la construcción de la infraestructura fundamental:

- Definición del esquema de base de datos en PostgreSQL mediante Prisma ORM, con las tablas centrales: `organizaciones`, `usuarios`, `facturas`, `categorias`, `factura_imagenes`, `logs_auditoria`, `sesiones` y `tags`.
- Implementación del módulo de autenticación: registro de empresa (onboarding en dos pasos), inicio de sesión con JWT, y sistema de recuperación de contraseñas por correo electrónico con tokens de un solo uso.
- Configuración del pipeline de procesamiento de facturas: integración con Azure Document Intelligence para extracción OCR, integración con Cloudinary para almacenamiento de imágenes.

### Fase 2 — Módulos de dominio

- Desarrollo del módulo de registro de facturas para empleados: zona de carga de imágenes (drag-and-drop), procesamiento dual QR+OCR, formulario de revisión y corrección de datos extraídos, guardado en base de datos.
- Desarrollo del panel de administración: tabla de facturas con filtros y paginación, modal de auditoría para aprobar o rechazar facturas con motivo, exportación a Excel.
- Desarrollo del módulo de gestión de usuarios: invitación por correo electrónico, asignación de roles, activación/desactivación, eliminación con protecciones de integridad.

### Fase 3 — Seguridad y aislamiento multi-tenant

Se identificaron y corrigieron vulnerabilidades críticas de seguridad:

- Todos los repositorios del backend fueron auditados y refactorizados para filtrar obligatoriamente por `organizacion_id` extraído del JWT. Se eliminó cualquier posibilidad de que un usuario autenticado en una organización acceda a datos de otra.
- Se implementaron Guards por rol (`RoleGuard`, `JwtAuthGuard`) en todos los endpoints sensibles.
- Se añadieron protecciones de negocio: un administrador no puede eliminarse a sí mismo, un SUPERADMIN no puede ser degradado por un rol inferior, un usuario eliminado no borra sus facturas asociadas (integridad de auditoría contable).

### Fase 4 — Calidad, UX y estabilidad del MVP

- Rediseño completo del sistema de notificaciones (toasts) con animaciones, barra de progreso y soporte de variantes.
- Creación de un componente modal genérico reutilizable que unifica el diseño de todos los diálogos del sistema.
- Corrección de múltiples problemas de interfaz: z-index del visor de facturas, proporciones de columnas en tablas, espaciado en formularios, limpieza de estado tras operaciones.
- Documentación técnica completa del proyecto.

---

## 3. INFORME DE PRUEBAS

Todas las pruebas descritas a continuación fueron realizadas manualmente durante el ciclo de desarrollo iterativo del MVP, verificando el comportamiento esperado en cada módulo crítico del sistema.

---

### 3.1 PRUEBAS FUNCIONALES

Las pruebas funcionales verifican que cada módulo ejecuta correctamente su flujo principal de trabajo de extremo a extremo.

#### Módulo de Autenticación

| ID | Escenario de prueba | Acción realizada | Resultado esperado | Resultado obtenido |
|---|---|---|---|---|
| AUTH-F01 | Registro de nueva empresa (onboarding) | Completar ambos pasos del wizard con datos válidos | Creación de organización y usuario SUPERADMIN; redirección al panel con modal de bienvenida | ✅ Correcto |
| AUTH-F02 | Inicio de sesión con credenciales válidas | Ingresar email y contraseña correctos | Generación de JWT; redirección al módulo correspondiente según rol | ✅ Correcto |
| AUTH-F03 | Solicitud de recuperación de contraseña | Ingresar email registrado | Envío de correo con enlace único; mensaje de confirmación en pantalla | ✅ Correcto |
| AUTH-F04 | Cambio de contraseña mediante token | Ingresar nueva contraseña desde el enlace del correo | Actualización de credenciales; invalidación del token; redirección a login | ✅ Correcto |
| AUTH-F05 | Cierre de sesión | Presionar botón "Salir" desde el navbar | Eliminación del JWT del almacenamiento local; redirección a pantalla de login | ✅ Correcto |

#### Módulo de Registro de Facturas (Empleado)

| ID | Escenario de prueba | Acción realizada | Resultado esperado | Resultado obtenido |
|---|---|---|---|---|
| REG-F01 | Subida de factura con código QR válido | Arrastrar imagen de factura con QR de DGI al componente de carga | Detección del QR en el cliente; verificación con backend; datos llenados automáticamente desde DGI | ✅ Correcto |
| REG-F02 | Subida de factura sin código QR | Subir imagen de factura física sin QR | Fallback automático a Azure OCR; campos extraídos por IA | ✅ Correcto |
| REG-F03 | Guardado de factura con datos completos | Revisar campos, seleccionar categoría y confirmar | Factura creada; imágenes subidas a Cloudinary; toast de éxito; formulario permanece visible | ✅ Correcto |
| REG-F04 | Descarte de factura procesada | Presionar "Descartar todo" después de procesar | Formulario limpio; imágenes eliminadas de la vista previa; estado reiniciado completamente | ✅ Correcto |
| REG-F05 | Subida de múltiples imágenes para una factura | Agregar hasta 10 imágenes para la misma factura | Todas las imágenes aceptadas y almacenadas con orden correcto para el carrusel | ✅ Correcto |
| REG-F06 | Visualización ampliada de imágenes (lightbox) | Hacer clic sobre la imagen de la factura | Apertura del visor en pantalla completa sin interferir con el navbar | ✅ Correcto |

#### Módulo de Auditoría de Facturas (Administrador)

| ID | Escenario de prueba | Acción realizada | Resultado esperado | Resultado obtenido |
|---|---|---|---|---|
| AUD-F01 | Listado de facturas con filtros | Aplicar filtros por estado, fecha o categoría | Lista filtrada con paginación correcta | ✅ Correcto |
| AUD-F02 | Aprobación de factura pendiente | Seleccionar factura y confirmar aprobación en el modal | Estado actualizado a "Aprobada"; toast de confirmación; lista actualizada | ✅ Correcto |
| AUD-F03 | Rechazo de factura con motivo | Ingresar motivo de rechazo y confirmar | Estado actualizado a "Rechazada"; motivo almacenado; empleado puede ver el ícono informativo | ✅ Correcto |
| AUD-F04 | Exportación de facturas a Excel | Presionar botón de exportación con filtros aplicados | Descarga del archivo .xlsx con todas las facturas del rango visible | ✅ Correcto |
| AUD-F05 | Selección múltiple de facturas | Marcar checkbox de múltiples facturas | Contador de selección actualizado; acciones grupales habilitadas | ✅ Correcto |

#### Módulo de Gestión de Usuarios (Administrador)

| ID | Escenario de prueba | Acción realizada | Resultado esperado | Resultado obtenido |
|---|---|---|---|---|
| USR-F01 | Invitación de nuevo usuario | Completar formulario de invitación con email, nombre y rol | Cuenta creada; correo de acceso enviado; usuario visible en la lista | ✅ Correcto |
| USR-F02 | Cambio de rol de usuario existente | Seleccionar nuevo rol desde el modal de acción | Rol actualizado en tiempo real; toast de confirmación | ✅ Correcto |
| USR-F03 | Desactivación de usuario | Cambiar estado de "Activo" a "Inactivo" | Usuario no puede iniciar sesión; estado visual actualizado | ✅ Correcto |
| USR-F04 | Eliminación de usuario sin facturas | Confirmar eliminación de usuario nuevo | Registro eliminado correctamente de la base de datos | ✅ Correcto |
| USR-F05 | Eliminación de usuario con facturas asociadas | Confirmar eliminación de usuario con historial | Usuario eliminado; sus facturas permanecen con `usuario_id = null` (integridad de auditoría) | ✅ Correcto |

---

### 3.2 PRUEBAS DE VALIDACIÓN DE DATOS

Las pruebas de validación verifican que el sistema rechaza o corrige correctamente entradas de datos inválidas o incompletas, tanto en el frontend como en el backend.

#### Validación en Formularios del Frontend

| ID | Campo / Formulario | Entrada de prueba | Comportamiento esperado | Resultado |
|---|---|---|---|---|
| VAL-F01 | Formulario de login — Email | Texto sin formato de correo ("usuario") | Campo marcado como inválido; mensaje de error visible; botón deshabilitado | ✅ Correcto |
| VAL-F02 | Formulario de login — Contraseña | Campo vacío | Formulario no se envía; validación activa | ✅ Correcto |
| VAL-F03 | Formulario de invitación — Email | Campo vacío | Botón "Enviar invitación" permanece deshabilitado | ✅ Correcto |
| VAL-F04 | Formulario de invitación — Rol | Sin seleccionar rol | Botón deshabilitado mientras `rol === ''` | ✅ Correcto |
| VAL-F05 | Formulario de factura — Total | Valor negativo o cero | Campo marcado con error; no permite guardar | ✅ Correcto |
| VAL-F06 | Formulario de factura — Fecha de emisión | Fecha futura a la fecha actual | Advertencia visual al usuario | ✅ Correcto |
| VAL-F07 | Componente carga de archivo — Tipo de archivo | Subir archivo .pdf o .docx en lugar de imagen | Alerta al usuario: archivo no válido; imagen no agregada al listado | ✅ Correcto |
| VAL-F08 | Componente carga de archivo — Tamaño | Subir imagen superior a 5 MB | Alerta al usuario: archivo supera el límite; imagen rechazada | ✅ Correcto |
| VAL-F09 | Componente carga de archivo — Límite de archivos | Intentar subir más de 10 imágenes | Alerta informativa; solo se procesan las primeras 10 | ✅ Correcto |
| VAL-F10 | Nombre en invitación (opcional) | Campo vacío | Se utiliza la parte local del email como nombre por defecto (ej: "juan" de "juan@empresa.com") | ✅ Correcto |

#### Validación en el Backend (API)

| ID | Endpoint | Condición de prueba | Comportamiento esperado | Resultado |
|---|---|---|---|---|
| VAL-B01 | POST /auth/login | Contraseña incorrecta | Respuesta 401 con mensaje genérico (no revela si el email existe) | ✅ Correcto |
| VAL-B02 | POST /auth/login | Usuario con estado inactivo | Respuesta 403 con mensaje "Cuenta desactivada" | ✅ Correcto |
| VAL-B03 | POST /facturas | `organizacion_id` manipulado en el body | El valor del body es ignorado; se usa siempre el del JWT | ✅ Correcto |
| VAL-B04 | GET /facturas/:id | ID de factura de otra organización | Respuesta 404 (no revela existencia del recurso) | ✅ Correcto |
| VAL-B05 | DELETE /usuarios/:id | ID del propio usuario autenticado | Respuesta 403 "No puedes eliminar tu propia cuenta" | ✅ Correcto |
| VAL-B06 | PATCH /usuarios/:id/rol | Intentar asignar rol SUPERADMIN desde rol CONTADOR | Respuesta 403 por insuficiencia de privilegios | ✅ Correcto |
| VAL-B07 | POST /auth/reset-password | Token ya utilizado | Respuesta 400 "Token inválido o expirado" | ✅ Correcto |
| VAL-B08 | POST /auth/reset-password | Token con más de 1 hora de antigüedad | Respuesta 400 "Token inválido o expirado" | ✅ Correcto |
| VAL-B09 | POST /facturas/procesar | Sin imágenes adjuntas | Respuesta 400 con descripción del campo requerido | ✅ Correcto |
| VAL-B10 | Cualquier endpoint protegido | Request sin header Authorization | Respuesta 401 "No autorizado" | ✅ Correcto |

---

### 3.3 PRUEBAS DE MANEJO DE ERRORES

Las pruebas de manejo de errores verifican que el sistema responde de forma controlada y comunicativa ante situaciones inesperadas, sin exponer información sensible ni dejar al usuario sin retroalimentación.

#### Errores de Conectividad y Servicios Externos

| ID | Escenario | Comportamiento esperado del sistema | Resultado |
|---|---|---|---|
| ERR-01 | El servicio de Azure OCR devuelve error o timeout | El backend captura la excepción; responde con mensaje descriptivo al frontend; el frontend muestra un toast de error con la descripción | ✅ Correcto |
| ERR-02 | Cloudinary rechaza la subida de imagen | Transacción abortada; no se crea el registro de factura en la base de datos; se retorna error al cliente | ✅ Correcto |
| ERR-03 | El servidor SMTP no está disponible al enviar invitación | El error de Nodemailer es capturado; se notifica al administrador sin romper el flujo de la aplicación | ✅ Correcto |
| ERR-04 | El scraping a DGI no encuentra el QR en su registro | El backend hace fallback a Azure OCR automáticamente; el usuario no nota la diferencia | ✅ Correcto |
| ERR-05 | Pérdida de conexión a la base de datos | Prisma lanza excepción; el Global Exception Filter de NestJS la captura y retorna 500 con mensaje genérico sin exponer detalles del stack | ✅ Correcto |

#### Errores de Interacción del Usuario

| ID | Escenario | Comportamiento esperado del sistema | Resultado |
|---|---|---|---|
| ERR-06 | Usuario navega a URL inexistente (`/ruta-que-no-existe`) | Se renderiza la página 404 personalizada con botón de redirección a login | ✅ Correcto |
| ERR-07 | Empleado intenta acceder a `/admin` directamente por URL | `RoleGuard` detecta rol insuficiente; redirige a `/facturas` sin mostrar contenido | ✅ Correcto |
| ERR-08 | Administrador intenta acceder a `/facturas` directamente | `RoleGuard` detecta rol; redirige a `/admin/facturas` | ✅ Correcto |
| ERR-09 | Token JWT expirado mientras el usuario está navegando | En la siguiente petición al backend se recibe 401; el `AuthService` del frontend intercepta la respuesta y ejecuta logout automático antes de redirigir a login | ✅ Correcto |
| ERR-10 | Error al guardar factura (fallo de red o backend) | El formulario permanece visible con los datos intactos; se muestra toast de error con descripción; el campo `isSaving` se resetea para permitir reintentar | ✅ Correcto |
| ERR-11 | QR detectado en cliente pero no verificable por backend | El backend ignora el QR del cliente y procesa con OCR; el usuario recibe los datos igualmente sin ver el error interno | ✅ Correcto |
| ERR-12 | Cierre del modal de confirmación (Escape o clic en backdrop) | El modal se cierra sin ejecutar la acción destructiva; el estado del sistema no cambia | ✅ Correcto |

---

## 4. OPTIMIZACIONES REALIZADAS AL SOFTWARE

Esta sección documenta las mejoras concretas aplicadas al sistema que resultaron en un impacto directo y medible sobre el rendimiento, la mantenibilidad, la seguridad y la experiencia de usuario.

---

### 4.1 OPTIMIZACIONES EN EL BACKEND

#### OPT-B01: Implementación del Patrón Repository con aislamiento multi-tenant

**Situación inicial:** Las consultas a la base de datos se realizaban directamente desde los servicios, sin una capa intermediaria. Los filtros por `organizacion_id` no eran consistentes en todos los módulos, lo que representaba un riesgo de seguridad severo: un usuario autenticado podía, bajo ciertas condiciones, acceder a datos de otra organización si conocía los identificadores.

**Optimización aplicada:** Se introdujo una capa de repositorios que encapsula todas las operaciones de Prisma. Cada repositorio recibe el `organizacion_id` como parámetro obligatorio y lo aplica en el `WHERE` de cada consulta. El `organizacion_id` nunca proviene del body del request — siempre se extrae del payload del JWT validado por el guard.

**Impacto:** Eliminación completa del vector de ataque cross-tenant. Centralización de la lógica de acceso a datos, reduciendo la duplicación de código en un estimado del 40%. Mayor facilidad para escribir pruebas unitarias al poder mockar el repositorio de forma independiente al servicio.

---

#### OPT-B02: Arquitectura de procesamiento dual QR + OCR con fallback inteligente

**Situación inicial:** Todas las facturas procesaban a través de Azure Document Intelligence, incurriendo en costos por cada llamada independientemente de si el documento tenía información legible por otros medios.

**Optimización aplicada:** Se implementó un pipeline de dos fases:
1. El cliente decodifica el QR mediante zxing-wasm (WebAssembly) en el browser, sin costo alguno.
2. El cliente envía el resultado del QR al backend junto con las imágenes.
3. El backend verifica el QR de forma independiente contra DGI mediante web scraping.
4. Solo si el QR no existe, no es legible o no está registrado en DGI, se invoca Azure OCR como fallback.

**Impacto:** En facturas con código QR visible (que representa la mayoría de las facturas formales emitidas en Panamá bajo regulación DGI), el costo de procesamiento por factura es cero. La precisión de los datos también mejora significativamente ya que los datos de DGI son la fuente oficial, mientras que el OCR puede introducir errores de lectura en imágenes de baja calidad.

---

#### OPT-B03: Transacciones atómicas en operaciones críticas

**Situación inicial:** La creación del primer usuario (onboarding) y la eliminación de usuarios con datos asociados se realizaban mediante operaciones secuenciales independientes. Si una operación fallaba a mitad del proceso, el sistema podía quedar en un estado inconsistente.

**Optimización aplicada:** Se envolvieron estas operaciones en transacciones explícitas de Prisma (`prisma.$transaction`). Si cualquier paso dentro de la transacción falla, se ejecuta un rollback completo y el sistema retorna al estado anterior.

**Impacto:** Cero posibilidad de organizaciones sin usuario administrador o usuarios sin organización asociada. Integridad referencial garantizada en operaciones de escritura compuestas.

---

#### OPT-B04: Corrección de integridad referencial al eliminar usuarios

**Situación inicial:** La tabla `facturas` tenía `usuario_id` como campo `NOT NULL` con `onDelete: Restrict`. Esto hacía imposible eliminar un usuario que tuviera facturas registradas, lo que bloqueaba completamente la operación de gestión de usuarios para todos los usuarios activos del sistema.

**Optimización aplicada:** Se ejecutó una migración de base de datos para hacer `usuario_id` nullable (`usuario_id String?`) y se cambió la política a `onDelete: SetNull`. Adicionalmente se añadió protección en el backend para que nunca sea posible eliminar al último administrador de una organización.

**Impacto:** La eliminación de usuarios ahora funciona correctamente para el 100% de los casos. Las facturas históricas se preservan con `usuario_id = null`, manteniendo la integridad del registro contable sin violar las reglas del negocio ni la trazabilidad de auditoría.

---

#### OPT-B05: Script de corrección post-generación de Prisma (`fix-generated.js`)

**Situación inicial:** Al actualizar a Prisma v6, el generador de clases con validación (`prisma-class-validator-generator`) producía código con referencias a `Prisma.Decimal` y `Prisma.JsonValue` que ya no existían en el nuevo namespace, rompiendo la compilación del proyecto completo.

**Optimización aplicada:** Se desarrolló un script Node.js (`prisma/fix-generated.js`) que se ejecuta automáticamente después de cada `prisma generate` (mediante el hook `postgenerate` en `package.json`). Este script parchea los archivos generados reemplazando las referencias obsoletas por los tipos correctos.

**Impacto:** El proceso de generación de cliente Prisma volvió a ser completamente automático y sin errores. El equipo de desarrollo puede ejecutar `npm run prisma:generate` con total confianza, sin necesidad de editar manualmente los archivos generados.

---

#### OPT-B06: Tokens de reset de contraseña con invalidación inmediata post-uso

**Situación inicial:** Los tokens de recuperación de contraseña no tenían mecanismo de invalidación post-uso, lo que teóricamente permitía reutilizarlos múltiples veces dentro de la ventana de expiración.

**Optimización aplicada:** El token se almacena hasheado en la base de datos con un campo `reset_token_expires_at`. Tras su primer uso exitoso, los campos `reset_token` y `reset_token_expires_at` se limpian inmediatamente en la misma transacción que actualiza la contraseña.

**Impacto:** Eliminación del vector de ataque de reutilización de tokens. Cumplimiento con las mejores prácticas de seguridad para flujos de recuperación de credenciales.

---

### 4.2 OPTIMIZACIONES EN EL FRONTEND

#### OPT-F01: Sistema de modal genérico reutilizable (`<app-modal>`)

**Situación inicial:** Cada modal del sistema (invitación de usuarios, acción sobre usuarios, aprobación de facturas) tenía su propio backdrop, panel, animaciones de entrada, estilos de header y lógica de cierre por tecla Escape. Esto resultaba en una duplicación de aproximadamente 150 líneas de CSS y 30 líneas de TypeScript por cada modal, con inconsistencias visuales entre ellos.

**Optimización aplicada:** Se creó el componente `shared/modal/modal.component` como único origen de verdad para todos los modales del sistema. Expone cinco variantes visuales (`default`, `info`, `success`, `warning`, `danger`), tres tamaños (`sm`, `md`, `lg`), slots de contenido con `ng-content` (`[modal-body]`, `[modal-footer]`, `[modal-icon]`), y manejo nativo de cierre por Escape y clic en backdrop. Todos los modales existentes fueron refactorizados para usar este componente.

**Impacto:** Reducción del CSS de componentes modal en aproximadamente 60%. Consistencia visual garantizada en todos los diálogos del sistema. Cualquier mejora futura al diseño del modal (animaciones, accesibilidad, tamaños) se aplica en un solo lugar y se propaga automáticamente a toda la aplicación.

---

#### OPT-F02: Rediseño del sistema de notificaciones (toasts)

**Situación inicial:** El sistema de toasts utilizaba estilos básicos sin identidad visual, sin retroalimentación de tiempo y sin diferenciación clara entre tipos de notificación. Los usuarios no sabían cuánto tiempo permanecería el mensaje en pantalla.

**Optimización aplicada:** Se rediseñó completamente el componente `shared/toast` con:
- Animación de entrada desde la derecha con efecto bounce mediante `cubic-bezier`.
- Barra de progreso animada en la base del toast con duración dinámica por `durationMs` por mensaje.
- Píldoras de ícono de 34×34 px con color de fondo específico por variante.
- Tipografía Quicksand consistente con el resto de la interfaz.
- `z-index: 11000` para garantizar visibilidad sobre cualquier modal o capa de la interfaz.
- Integración en todos los módulos: `admin-usuarios` (6 acciones), `cargar-factura` (OCR, guardado), `admin-facturas` (aprobación, rechazo).

**Impacto:** Los usuarios reciben retroalimentación visual clara e inmediata para cada acción crítica del sistema. La barra de progreso elimina la incertidumbre sobre la persistencia del mensaje. La coherencia visual refuerza la identidad del producto.

---

#### OPT-F03: Corrección de z-index dinámico en el visor de facturas

**Situación inicial:** El componente `factura-view` tenía un `z-index: 1001` estático con `position: sticky`, lo que hacía que el visor se superpusiera al navbar durante el scroll de la página, ocultando la navegación completamente.

**Optimización aplicada:** Se implementó un sistema de `z-index` dinámico mediante comunicación entre componentes: el componente `factura-view` emite un `@Output() lightboxChange: EventEmitter<boolean>` que el componente padre escucha para aplicar condicionalmente la clase CSS `viewer--lightbox`. En estado normal, el visor tiene `z-index: 1`; solo cuando el lightbox está activo se eleva a `z-index: 1001`.

```
Estado normal:    viewer z-index: 1      (debajo del navbar: 1000)
Lightbox activo:  viewer z-index: 1001   (encima del navbar: 1000)
```

**Impacto:** La navegación es siempre accesible durante el scroll de la página. El lightbox sigue funcionando correctamente cuando se necesita. La solución no requiere JavaScript para calcular posiciones, solo clases CSS condicionales.

---

#### OPT-F04: Gestión de estado limpio post-guardado de facturas

**Situación inicial:** Después de guardar una factura, el componente `CargarFacturaComponent` llamaba a `limpiarEstadoPadre()` que reseteaba el formulario OCR y la URL de imágenes del estado del componente padre. Sin embargo, el componente hijo `CargarArchivoComponent` mantenía su propio estado interno (el array `imagenes` con las previsualizaciones), por lo que las miniaturas cargadas permanecían visibles en pantalla incluso después de que la factura fuera guardada exitosamente.

**Optimización aplicada:** Se añadió un método público `reset()` al componente `CargarArchivoComponent`, y el componente padre lo invoca mediante `@ViewChild` dentro del flujo de limpieza. La llamada se realiza solo cuando el usuario explícitamente descarta la sesión (botón "Descartar todo") — al guardar una factura, el formulario permanece visible para que el usuario pueda continuar sin interrupciones.

**Impacto:** El estado de la interfaz es completamente coherente con el estado del sistema. Al descartar, toda la información visual (imágenes, formulario, visor) se limpia atómicamente. La experiencia de usuario final es predecible y sin residuos visuales de sesiones anteriores.

---

#### OPT-F05: Corrección de proporciones de columnas en tabla de facturas

**Situación inicial:** La tabla del componente `factura-card-table` usaba el sistema CSS Grid con la columna COMERCIO definida como `1fr` (una fracción del espacio disponible) y todas las demás columnas con anchos fijos en píxeles. En pantallas anchas, la columna COMERCIO absorbía la totalidad del espacio libre, generando una tabla con proporciones extremadamente desbalanceadas.

**Optimización aplicada:** Se cambió la definición del grid de `120px 1fr 140px 130px 110px 130px` a `120px 2fr 1.2fr 1fr 110px 120px`, distribuyendo el espacio flexible entre las tres columnas de contenido variable (COMERCIO, CATEGORÍA, Nº FACTURA) en proporción 2:1.2:1.

**Impacto:** La tabla mantiene proporciones visualmente equilibradas independientemente del ancho del contenedor. El diseño responde correctamente en pantallas de cualquier resolución.

---

#### OPT-F06: Reducción del espaciado vertical en el formulario OCR

**Situación inicial:** El formulario de edición de datos OCR (`factura-form`) presentaba márgenes y paddings excesivos entre secciones, obligando al usuario a hacer scroll innecesario para acceder a los campos inferiores del formulario en resoluciones de pantalla estándar.

**Optimización aplicada:** Se redujeron sistemáticamente los espaciados en el CSS del componente:
- Gap del contenedor principal: `1.75rem → 1.1rem`
- Padding superior de la tarjeta: `1.75rem → 1.25rem`
- Padding inferior de cada sección: `1.75rem → 1.1rem`
- Margen inferior del subtítulo de sección: `1.5rem → 0.875rem`
- Gap del grid de campos: `1.5rem → 1rem`
- Padding del contenedor financiero: `1.5rem → 1rem`

**Impacto:** El formulario completo es visible sin scroll en resoluciones de 1080p o superiores. La densidad de información es apropiada para una aplicación de gestión empresarial manteniendo la legibilidad.

---

#### OPT-F07: Guard de rutas con decodificación local de JWT

**Situación inicial:** La protección de rutas dependía de peticiones al backend para verificar la autenticidad y los permisos del usuario en cada navegación, aumentando la latencia percibida al cambiar de sección.

**Optimización aplicada:** `RoleGuard` y `AuthGuard` decodifican el payload del JWT almacenado localmente sin hacer peticiones al servidor. La verificación incluye validación de firma, expiración del token (`exp` vs `Date.now()`) y comprobación del rol contra los roles permitidos declarados en el metadata de la ruta.

**Impacto:** Las transiciones entre rutas protegidas son inmediatas, sin latencia de red. La seguridad no se compromete porque la verificación de firma sigue siendo criptográficamente sólida; solo se evita la consulta redundante al servidor para rutas ya autenticadas.

---

## 5. INFORME DEL MVP FUNCIONAL — MÓDULOS CLAVE

### 5.1 Visión General del Sistema

Expensly MVP v1.0.0 es una plataforma empresarial completamente funcional que cubre el ciclo completo de gestión de gastos: desde la captura digital de una factura física por parte de un empleado, hasta su validación y aprobación por un administrador, pasando por el procesamiento inteligente de datos mediante Inteligencia Artificial.

El sistema soporta múltiples organizaciones en la misma instancia (multi-tenant), con aislamiento completo de datos. Cada empresa que se registre opera en un espacio completamente independiente.

---

### 5.2 Módulos del Sistema

#### MÓDULO 1: Autenticación y Onboarding

**Descripción:** Gestiona el acceso al sistema y el ciclo de vida de la identidad del usuario.

**Funcionalidades entregadas:**
- Registro de nueva empresa mediante wizard de dos pasos: información corporativa (razón social, RUC, DV) y configuración de la cuenta del administrador.
- Inicio de sesión con validación de credenciales, verificación de estado activo del usuario y emisión de JWT firmado.
- Recuperación de contraseña mediante correo electrónico con token de un solo uso y ventana de expiración de 60 minutos.
- Cierre de sesión con limpieza del token del almacenamiento local y redirección automática.
- Modal de bienvenida al completar el onboarding con confirmación visual de los pasos completados.
- Redirección automática según rol: SUPERADMIN/CONTADOR → panel de administración; EMPLEADO → módulo de facturas.

**Usuarios objetivo:** Todos los roles del sistema.

---

#### MÓDULO 2: Registro y Procesamiento de Facturas

**Descripción:** Flujo principal de trabajo para el empleado. Permite capturar, procesar y archivar facturas con el mínimo esfuerzo manual posible.

**Funcionalidades entregadas:**
- Zona de carga de imágenes con soporte de arrastrar y soltar (drag-and-drop) y selección de archivo convencional.
- Previsualización de imágenes antes del procesamiento, con capacidad de eliminar imágenes individuales o añadir hasta 10 por factura.
- Procesamiento dual automático: detección de código QR en el browser (sin costo) con fallback a Azure Document Intelligence si no se encuentra QR.
- Formulario editable con todos los campos extraídos por IA: proveedor, RUC, DV, número de factura, fecha de emisión, subtotal, ITBMS, total.
- Selector de categoría de gasto para clasificación contable.
- Visor sticky de las imágenes de la factura a la derecha del formulario, con lightbox para ampliación.
- Guardado de la factura con las imágenes asociadas en Cloudinary, manteniendo el orden de visualización.
- Sistema de notificaciones para cada etapa del proceso (datos extraídos, factura guardada, error de procesamiento).

**Usuarios objetivo:** EMPLEADO, CONTADOR.

---

#### MÓDULO 3: Visualización de Facturas Propias

**Descripción:** Permite al empleado consultar su historial de facturas registradas con información básica del estado de auditoría.

**Funcionalidades entregadas:**
- Tabla paginada de facturas propias ordenadas por fecha.
- Columnas: fecha de emisión, comercio (con avatar generado por iniciales y color), categoría, número de factura, total y estado.
- Estado visual diferenciado: Pendiente (gris), Aprobada (verde), Rechazada (rojo).
- Indicador informativo en facturas rechazadas con el motivo en tooltip.
- Grid de columnas responsivo con proporciones balanceadas.

**Usuarios objetivo:** EMPLEADO, CONTADOR.

---

#### MÓDULO 4: Auditoría y Administración de Facturas

**Descripción:** Panel centralizado para que los administradores revisen todas las facturas de la organización y tomen decisiones de aprobación.

**Funcionalidades entregadas:**
- Tabla completa de facturas de toda la organización con columnas adicionales: empleado que registró, estado.
- Toolbar con filtros por estado, fecha, categoría y empleado.
- Selección múltiple de facturas para operaciones en lote.
- Modal de auditoría detallado: visualización de imágenes de la factura, todos los datos extraídos, historial de la factura.
- Aprobación de factura con un clic y confirmación.
- Rechazo de factura con campo obligatorio de motivo (visible para el empleado).
- Exportación del listado filtrado a archivo Excel (.xlsx) con todos los campos relevantes.
- Paginación del servidor para manejar volúmenes grandes de facturas sin degradación de rendimiento.

**Usuarios objetivo:** CONTADOR, SUPERADMIN.

---

#### MÓDULO 5: Gestión de Usuarios

**Descripción:** Panel de control para que el SUPERADMIN administre los miembros de su organización.

**Funcionalidades entregadas:**
- Listado de todos los usuarios de la organización con su rol, estado y fecha de registro.
- Invitación de nuevo usuario por correo electrónico: el sistema crea la cuenta y envía el email de acceso automáticamente. El campo nombre es opcional — si no se ingresa, se utiliza la parte local del email como nombre de display.
- Cambio de rol de usuario (EMPLEADO ↔ CONTADOR) con confirmación en modal.
- Activación y desactivación de cuentas sin eliminar datos históricos.
- Eliminación de usuario con protecciones:
  - No se puede eliminar la propia cuenta.
  - No se puede eliminar a otro administrador.
  - Las facturas del usuario eliminado se preservan con referencia nula.
- Estados visuales claros: menú de acciones contextual por usuario, con opciones habilitadas/deshabilitadas según contexto.
- Notificaciones toast para cada operación completada.

**Usuarios objetivo:** SUPERADMIN.

---

### 5.3 Infraestructura y Servicios Integrados

| Servicio | Propósito | Decisión técnica |
|---|---|---|
| PostgreSQL (Supabase) | Base de datos principal | ACID, UUID nativo, FK con políticas `onDelete` explícitas |
| Cloudinary | Almacenamiento de imágenes | CDN global, URLs permanentes, sin gestión de servidores de archivos |
| Azure Document Intelligence | OCR de facturas | Modelo `prebuilt-invoice` entrenado para facturas; alta precisión en fotografías de baja calidad |
| zxing-wasm | Decodificación QR en browser | WebAssembly sin costo de servidor; GPU del cliente |
| DGI (web scraping) | Fuente oficial de datos de facturas QR | Elimina costos de OCR cuando el QR es válido |
| Nodemailer + SMTP | Correos transaccionales | Invitaciones, reset de contraseña |
| xlsx | Exportación Excel | Sin dependencias nativas; genera en memoria |

---

### 5.4 Modelo de Roles y Permisos

| Acción | EMPLEADO | CONTADOR | SUPERADMIN |
|---|---|---|---|
| Registrar facturas propias | ✅ | ✅ | ✅ |
| Ver propias facturas | ✅ | ✅ | ✅ |
| Ver todas las facturas de la org | ❌ | ✅ | ✅ |
| Aprobar / rechazar facturas | ❌ | ✅ | ✅ |
| Exportar Excel | ❌ | ✅ | ✅ |
| Ver lista de usuarios | ❌ | ❌ | ✅ |
| Invitar usuarios | ❌ | ❌ | ✅ |
| Cambiar roles | ❌ | ❌ | ✅ |
| Eliminar usuarios | ❌ | ❌ | ✅ |

---

### 5.5 Stack Tecnológico del MVP

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | Angular | 19.2 |
| Backend | NestJS | 11.0 |
| ORM | Prisma | 6.x |
| Base de datos | PostgreSQL | 15+ |
| Lenguaje | TypeScript | 5.7 |
| Autenticación | JWT + Bcrypt | — |
| Contenido estático | Cloudinary CDN | — |
| OCR | Azure Document Intelligence | REST API v1.0 |

---

## 6. CONCLUSIONES Y PRÓXIMOS PASOS

### Logros del MVP v1.0.0

El MVP de Expensly entrega una plataforma empresarial completamente funcional que automatiza el proceso de gestión de gastos de principio a fin. Los logros más significativos del ciclo de desarrollo son:

1. **Procesamiento inteligente con costo mínimo:** La arquitectura dual QR+OCR garantiza que las facturas con código QR —que representan la mayoría de comprobantes formales en Panamá— se procesen sin costo de API de terceros.

2. **Seguridad multi-tenant robusta:** El aislamiento completo de datos entre organizaciones es implementado a nivel de arquitectura, no como una capa superficial de validación. Es estructuralmente imposible para un usuario autenticado ver datos de otra organización.

3. **Experiencia de usuario cohesiva:** El sistema de diseño interno (componente modal genérico, sistema de toasts, tipografía Quicksand, paleta índigo) garantiza consistencia visual en toda la aplicación sin código duplicado.

4. **Integridad de datos garantizada:** Gracias a las políticas de base de datos (`onDelete: SetNull`, `onDelete: Cascade`) y las transacciones atómicas, el sistema no puede quedar en estados inconsistentes ni ante errores de red ni ante operaciones concurrentes.

### Funcionalidades Planificadas para Siguientes Versiones

| Funcionalidad | Prioridad | Descripción |
|---|---|---|
| Dashboard analítico | Alta | Gráficas de gastos por categoría, mes y empleado |
| Notificaciones en tiempo real | Media | WebSockets para alertas de aprobación/rechazo al empleado |
| Reportes PDF | Media | Generación y descarga de informes contables en formato PDF |
| Autenticación de dos factores (2FA) | Alta | OTP por email o aplicación autenticadora para cuentas admin |
| Tests automatizados E2E | Alta | Suite de pruebas con Cypress para los flujos críticos |
| Soporte móvil (PWA) | Baja | Instalación como aplicación progresiva en dispositivos móviles |
| Integración con sistemas contables | Baja | Exportación en formato compatible con SAP, QuickBooks u otros ERP |

---

*Documento preparado por el equipo de desarrollo de Expensly.*
*Versión MVP 1.0.0 — Rama `main` — 1 de marzo de 2026*
