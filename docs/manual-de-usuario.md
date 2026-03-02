# MANUAL DE USUARIO — EXPENSLY

**Producto:** Expensly — Sistema Empresarial de Gestión de Gastos
**Versión:** MVP 1.0.0
**Fecha:** 1 de marzo de 2026
**Audiencia:** Todos los usuarios del sistema (Empleados, Contadores, Administradores)

---

## TABLA DE CONTENIDOS

1. [Introducción](#1-introducción)
2. [Acceso al Sistema](#2-acceso-al-sistema)
   - 2.1 [Registro de una Nueva Empresa (Onboarding)](#21-registro-de-una-nueva-empresa-onboarding)
   - 2.2 [Inicio de Sesión](#22-inicio-de-sesión)
   - 2.3 [Recuperación de Contraseña](#23-recuperación-de-contraseña)
   - 2.4 [Cierre de Sesión](#24-cierre-de-sesión)
3. [Roles de Usuario](#3-roles-de-usuario)
4. [Manual del Empleado](#4-manual-del-empleado)
   - 4.1 [Registrar una Factura](#41-registrar-una-factura)
   - 4.2 [Ver Mis Facturas](#42-ver-mis-facturas)
5. [Manual del Contador](#5-manual-del-contador)
   - 5.1 [Panel de Facturas de la Organización](#51-panel-de-facturas-de-la-organización)
   - 5.2 [Auditar una Factura](#52-auditar-una-factura)
   - 5.3 [Filtrar Facturas](#53-filtrar-facturas)
   - 5.4 [Exportar Facturas a Excel](#54-exportar-facturas-a-excel)
6. [Manual del Administrador (SUPERADMIN)](#6-manual-del-administrador-superadmin)
   - 6.1 [Gestión de Usuarios](#61-gestión-de-usuarios)
   - 6.2 [Invitar a un Nuevo Usuario](#62-invitar-a-un-nuevo-usuario)
   - 6.3 [Cambiar el Rol de un Usuario](#63-cambiar-el-rol-de-un-usuario)
   - 6.4 [Activar o Desactivar un Usuario](#64-activar-o-desactivar-un-usuario)
   - 6.5 [Eliminar un Usuario](#65-eliminar-un-usuario)
7. [Preguntas Frecuentes (FAQ)](#7-preguntas-frecuentes-faq)
8. [Mensajes de Error Comunes](#8-mensajes-de-error-comunes)

---

## 1. INTRODUCCIÓN

Expensly es una plataforma web diseñada para simplificar y digitalizar la gestión de gastos empresariales. En lugar de conservar tickets físicos o digitarlos manualmente, los empleados fotografían sus facturas directamente desde el navegador y el sistema extrae automáticamente toda la información fiscal relevante utilizando Inteligencia Artificial.

### ¿Qué puede hacer con Expensly?

Dependiendo de su rol dentro de la organización, podrá:

- **Fotografiar y registrar facturas** en segundos, con extracción automática de datos.
- **Consultar el historial** de sus facturas y ver si fueron aprobadas o rechazadas.
- **Auditar y aprobar facturas** de todos los empleados de su organización.
- **Exportar reportes** a Excel con los filtros que necesite.
- **Administrar los miembros** de su empresa: invitar, desactivar o eliminar usuarios.

### Navegadores compatibles

Expensly funciona en cualquier navegador moderno. Se recomienda:

- Google Chrome 110+
- Microsoft Edge 110+
- Mozilla Firefox 110+
- Safari 16+

> **Nota:** La decodificación automática de códigos QR requiere que el navegador soporte WebAssembly. Todos los navegadores de la lista anterior lo incluyen.

---

## 2. ACCESO AL SISTEMA

### 2.1 Registro de una Nueva Empresa (Onboarding)

El proceso de registro de una nueva organización se realiza una única vez por empresa. Al finalizar, se crea automáticamente la cuenta del primer usuario administrador (SUPERADMIN).

**¿Quién debe hacer esto?** El representante de la empresa que administrará el sistema.

#### Paso 1 — Datos de la empresa

1. Ingrese a la dirección web de Expensly en su navegador.
2. Haga clic en **"Registrar mi empresa"**.
3. Complete el formulario con los datos de su organización:

| Campo | Descripción | Obligatorio |
|---|---|---|
| Razón social | Nombre legal de la empresa | Sí |
| RUC | Registro Único de Contribuyente | Sí |
| DV | Dígito verificador del RUC | Sí |

4. Haga clic en **"Siguiente"** para avanzar al Paso 2.

> **Datos de Panamá:** El sistema está diseñado para el mercado panameño. El RUC y DV corresponden al registro tributario de la DGI.

#### Paso 2 — Cuenta de administrador

Complete los datos del usuario que administrará el sistema:

| Campo | Descripción | Obligatorio |
|---|---|---|
| Nombre completo | Nombre del administrador | Sí |
| Correo electrónico | Será su usuario de acceso | Sí |
| Contraseña | Mínimo 8 caracteres | Sí |

5. Haga clic en **"Crear cuenta"**.
6. Si todos los datos son correctos, verá una pantalla de bienvenida confirmando que su empresa fue registrada exitosamente.
7. Será redirigido automáticamente al **Panel de Administración**.

#### Errores posibles durante el registro

| Mensaje | Causa | Solución |
|---|---|---|
| "Correo ya registrado" | El email ingresado ya existe en el sistema | Use un correo diferente |
| "Datos inválidos" | Algún campo no cumple el formato requerido | Revise los campos marcados en rojo |

---

### 2.2 Inicio de Sesión

1. Ingrese a la dirección web de Expensly.
2. Escriba su **correo electrónico** y **contraseña**.
3. Haga clic en **"Iniciar sesión"**.

Al autenticarse correctamente, el sistema lo redirigirá automáticamente a la sección que le corresponde según su rol:

| Rol | Redirección automática |
|---|---|
| SUPERADMIN | Panel de administración → Facturas |
| CONTADOR | Panel de administración → Facturas |
| EMPLEADO | Módulo de carga de facturas |

> **Consejo de seguridad:** No comparta su contraseña con nadie. Cada usuario debe tener sus propias credenciales de acceso.

---

### 2.3 Recuperación de Contraseña

Si olvidó su contraseña, siga estos pasos:

#### Paso 1 — Solicitar el enlace de recuperación

1. En la pantalla de inicio de sesión, haga clic en **"¿Olvidaste tu contraseña?"**.
2. Ingrese el **correo electrónico** asociado a su cuenta.
3. Haga clic en **"Enviar enlace"**.
4. Recibirá un mensaje en pantalla indicando que, si el correo está registrado, recibirá un enlace de recuperación.

> **Importante:** Por razones de seguridad, el sistema muestra el mismo mensaje independientemente de si el correo existe o no. Esto evita que personas externas descubran qué correos están registrados.

#### Paso 2 — Establecer la nueva contraseña

1. Revise su bandeja de entrada. El correo puede tardar hasta 5 minutos en llegar.
2. Haga clic en el botón o enlace del correo. El enlace tiene una **vigencia de 60 minutos**.
3. Ingrese su nueva contraseña dos veces para confirmarla.
4. Haga clic en **"Restablecer contraseña"**.
5. Será redirigido a la pantalla de inicio de sesión. Ya puede ingresar con su nueva contraseña.

> **El enlace solo puede usarse una vez.** Después de cambiar la contraseña, el enlace queda invalidado. Si lo necesita nuevamente, repita el proceso desde el Paso 1.

---

### 2.4 Cierre de Sesión

Para cerrar su sesión de forma segura:

1. Haga clic en su nombre o avatar en la esquina superior derecha de la pantalla.
2. Seleccione **"Cerrar sesión"** en el menú desplegable.

El sistema eliminará su sesión activa y lo redirigirá a la pantalla de inicio de sesión.

> **Buena práctica:** Cierre siempre su sesión cuando use un equipo compartido o público.

---

## 3. ROLES DE USUARIO

Expensly maneja tres niveles de acceso dentro de cada organización:

### SUPERADMIN — Administrador de la Organización

Es el rol de mayor privilegio. Generalmente lo tiene el responsable de tecnología o el dueño de la empresa. El SUPERADMIN puede hacer todo lo que puede hacer un CONTADOR, más la gestión completa de usuarios.

**Acceso a:** Panel de administración de facturas + Panel de gestión de usuarios.

### CONTADOR — Auditor de Facturas

Tiene acceso de solo lectura y acción sobre las facturas de la organización. No puede gestionar otros usuarios.

**Acceso a:** Panel de administración de facturas (auditoría, filtros, exportación).

### EMPLEADO — Usuario Operativo

Es el usuario que registra las facturas del día a día. Solo puede ver sus propias facturas registradas.

**Acceso a:** Módulo de carga de facturas + historial de sus propias facturas.

### Comparativa de permisos

| Funcionalidad | EMPLEADO | CONTADOR | SUPERADMIN |
|---|---|---|---|
| Registrar facturas propias | ✅ | ✅ | ✅ |
| Ver historial de facturas propias | ✅ | ✅ | ✅ |
| Ver facturas de toda la organización | ❌ | ✅ | ✅ |
| Aprobar o rechazar facturas | ❌ | ✅ | ✅ |
| Exportar reporte a Excel | ❌ | ✅ | ✅ |
| Ver lista de usuarios | ❌ | ❌ | ✅ |
| Invitar nuevos usuarios | ❌ | ❌ | ✅ |
| Cambiar el rol de un usuario | ❌ | ❌ | ✅ |
| Activar o desactivar usuarios | ❌ | ❌ | ✅ |
| Eliminar usuarios | ❌ | ❌ | ✅ |

---

## 4. MANUAL DEL EMPLEADO

Esta sección describe las funciones disponibles para usuarios con rol **EMPLEADO**.

### 4.1 Registrar una Factura

El registro de facturas es el flujo principal de trabajo del empleado. El sistema puede extraer automáticamente todos los datos de la factura a partir de una fotografía.

#### Acceder al módulo

Al iniciar sesión como EMPLEADO, será redirigido directamente a la sección **"Cargar Factura"**. También puede acceder desde el menú de navegación en la parte superior.

#### Paso 1 — Cargar las imágenes de la factura

La pantalla muestra una zona de carga en el lado izquierdo.

**Opciones para agregar imágenes:**
- **Arrastrar y soltar:** Arrastre una o varias fotografías de la factura directamente desde su explorador de archivos hacia la zona de carga.
- **Seleccionar archivos:** Haga clic sobre la zona de carga y seleccione los archivos desde su dispositivo.

**Requisitos de las imágenes:**

| Parámetro | Límite |
|---|---|
| Formatos aceptados | JPG, JPEG, PNG, WEBP |
| Tamaño máximo por imagen | 5 MB |
| Máximo de imágenes por factura | 10 |

> **Consejo:** Si la factura ocupa varias páginas, puede subir todas las imágenes juntas. El sistema las procesará de forma conjunta y extraerá la información completa.

Una vez cargadas, las miniaturas de las imágenes aparecerán listadas en la zona de carga. Puede eliminar alguna imagen individual haciendo clic en la "X" que aparece sobre cada miniatura.

#### Paso 2 — Procesamiento automático

Haga clic en el botón **"Procesar factura"**. El sistema iniciará la extracción de datos de forma automática.

**¿Qué hace el sistema en este paso?**

1. Intenta detectar el **código QR** de la DGI directamente en su navegador (proceso instantáneo y sin costo).
2. Si encuentra un QR válido, consulta el portal oficial de la DGI para obtener los datos certificados de la factura.
3. Si no hay QR o no es legible, utiliza **Inteligencia Artificial (Azure Document Intelligence)** para leer el texto de las imágenes y extraer los datos.

Este proceso tarda entre 5 y 15 segundos dependiendo de la calidad de las imágenes.

#### Paso 3 — Revisar y corregir los datos extraídos

Una vez procesada la factura, el formulario en el lado derecho de la pantalla se completará automáticamente con los datos extraídos. **Revise siempre los campos antes de guardar.**

| Campo | Descripción |
|---|---|
| Comercio / Proveedor | Nombre de la empresa o negocio que emitió la factura |
| RUC | Registro tributario del proveedor |
| DV | Dígito verificador del RUC del proveedor |
| N° de factura | Número único del comprobante |
| Fecha de emisión | Fecha en que se emitió la factura |
| Subtotal | Monto antes de impuestos |
| ITBMS | Impuesto (7% en Panamá) |
| Total | Monto final del comprobante |
| Categoría | Clasificación del gasto (seleccionar de la lista) |

> **Si un campo está vacío o incorrecto:** Edítelo manualmente. El sistema no impide guardar aunque los campos de texto estén vacíos, pero el campo **Total** es obligatorio.

En el lado derecho de la pantalla también puede ver un **visor de imágenes** con las fotografías de la factura. Puede hacer clic sobre la imagen para ampliarla en pantalla completa.

#### Paso 4 — Guardar la factura

1. Asegúrese de haber seleccionado una **categoría** para la factura.
2. Haga clic en **"Guardar factura"**.
3. Verá una notificación verde en la esquina superior derecha confirmando que la factura fue guardada correctamente.

La factura quedará en estado **Pendiente** hasta que un Contador o Administrador la revise.

#### Descartar una factura

Si decide no guardar la factura actual y empezar de nuevo:

1. Haga clic en el botón **"Descartar todo"**.
2. El formulario y las imágenes se limpiarán completamente. Esta acción no tiene efecto sobre facturas ya guardadas previamente.

> **Nota:** Guardar una factura no limpia el formulario. Puede continuar registrando otra factura de inmediato sin necesidad de recargar la página.

---

### 4.2 Ver Mis Facturas

En esta sección puede consultar el historial de todas las facturas que ha registrado, junto con su estado de revisión.

#### Acceder al historial

Haga clic en **"Mis Facturas"** en el menú de navegación superior.

#### Información de la tabla

Cada fila de la tabla muestra:

| Columna | Descripción |
|---|---|
| Fecha | Fecha de emisión de la factura |
| Comercio | Nombre del proveedor (con avatar de iniciales y color) |
| Categoría | Clasificación del gasto asignada |
| N° Factura | Número del comprobante |
| Total | Monto total de la factura |
| Estado | Estado actual de la revisión |

#### Estados de una factura

| Estado | Color | Significado |
|---|---|---|
| **Pendiente** | Gris | La factura está esperando ser revisada por un administrador o contador |
| **Aprobada** | Verde | La factura fue revisada y aceptada |
| **Rechazada** | Rojo | La factura fue rechazada; hay un motivo disponible |

#### Ver el motivo de rechazo

Si una factura aparece como **Rechazada**, verá un ícono de información (ⓘ) junto al estado. Pase el cursor sobre ese ícono para leer el motivo de rechazo que ingresó el revisor.

Si necesita volver a registrar la factura con correcciones, deberá hacerlo como una nueva entrada desde el módulo de carga.

---

## 5. MANUAL DEL CONTADOR

Esta sección describe las funciones disponibles para usuarios con rol **CONTADOR**. El Contador tiene acceso a todas las funciones del Empleado, más el panel completo de administración de facturas.

### 5.1 Panel de Facturas de la Organización

Al iniciar sesión como CONTADOR, será redirigido al **Panel de Administración → Facturas**, donde puede ver todas las facturas registradas por todos los empleados de la organización.

#### Información de la tabla

La tabla muestra las siguientes columnas:

| Columna | Descripción |
|---|---|
| Fecha | Fecha de emisión de la factura |
| Comercio | Nombre del proveedor |
| Empleado | Nombre del usuario que registró la factura |
| Categoría | Clasificación del gasto |
| N° Factura | Número del comprobante |
| Total | Monto total |
| Estado | Estado de revisión (Pendiente / Aprobada / Rechazada) |

La tabla soporta **paginación del servidor**, lo que significa que puede manejar miles de facturas sin afectar el rendimiento.

---

### 5.2 Auditar una Factura

#### Abrir el modal de auditoría

Haga clic sobre cualquier fila de la tabla de facturas para abrir el **Modal de Auditoría**, donde podrá ver todos los detalles de la factura y tomar una decisión.

El modal contiene:
- Un **carrusel de imágenes** con las fotografías del comprobante
- Todos los **datos extraídos** de la factura
- El **nombre del empleado** que la registró y la fecha de subida

#### Aprobar una factura

1. Abra el modal de la factura que desea aprobar.
2. Haga clic en el botón **"Aprobar"**.
3. Confirme la acción en el cuadro de confirmación que aparece.
4. La factura cambiará a estado **Aprobada** y la tabla se actualizará automáticamente.

#### Rechazar una factura

1. Abra el modal de la factura que desea rechazar.
2. Haga clic en el botón **"Rechazar"**.
3. Ingrese el **motivo del rechazo** en el campo de texto. Este mensaje será visible para el empleado que registró la factura.
4. Haga clic en **"Confirmar rechazo"**.
5. La factura cambiará a estado **Rechazada** y la tabla se actualizará automáticamente.

> **El motivo de rechazo es obligatorio.** No es posible rechazar una factura sin especificar la razón. Esto garantiza que el empleado comprenda qué corrección debe hacer.

---

### 5.3 Filtrar Facturas

La barra de herramientas sobre la tabla de facturas ofrece múltiples filtros para facilitar la búsqueda y revisión.

#### Filtros disponibles

| Filtro | Descripción |
|---|---|
| Estado | Mostrar solo: Todas, Pendientes, Aprobadas, Rechazadas |
| Fecha desde / hasta | Filtrar por rango de fechas de emisión |
| Categoría | Filtrar por categoría de gasto |
| Empleado | Filtrar por el usuario que registró las facturas |

Los filtros se aplican de forma combinada: puede seleccionar varios simultáneamente para acotar los resultados.

#### Limpiar filtros

Para eliminar todos los filtros y volver a ver todas las facturas, haga clic en el botón **"Limpiar filtros"** o recargue la página.

---

### 5.4 Exportar Facturas a Excel

Puede exportar el listado de facturas actualmente visible (con los filtros aplicados) a un archivo Excel (.xlsx).

1. Aplique los filtros deseados para seleccionar el rango de facturas que necesita exportar.
2. Haga clic en el botón de **exportación** (ícono de hoja de cálculo) en la barra de herramientas.
3. El archivo se descargará automáticamente en su dispositivo.

El archivo exportado incluye todas las columnas de la tabla: fecha, comercio, RUC, N° factura, subtotal, ITBMS, total, categoría, empleado y estado.

> **Consejo:** Si necesita un reporte mensual, use el filtro de rango de fechas antes de exportar. El archivo reflejará exactamente lo que está visible en la tabla en ese momento.

---

## 6. MANUAL DEL ADMINISTRADOR (SUPERADMIN)

Esta sección describe las funciones exclusivas del rol **SUPERADMIN**. El Administrador tiene acceso completo a todas las funciones del sistema, incluyendo la gestión de los miembros de la organización.

> El SUPERADMIN también tiene acceso a todas las funciones del Contador descritas en la sección anterior.

### 6.1 Gestión de Usuarios

Acceda al panel de gestión de usuarios desde el menú lateral izquierdo, haciendo clic en **"Usuarios"**.

La tabla de usuarios muestra:

| Columna | Descripción |
|---|---|
| Usuario | Avatar con iniciales, nombre completo y correo electrónico |
| Rol | Rol actual del usuario en la organización |
| Estado | Activo (verde) o Inactivo (gris) |
| Fecha de registro | Cuándo se creó la cuenta |
| Acciones | Menú de opciones disponibles para ese usuario |

#### Menú de acciones

Cada usuario en la tabla tiene un botón de tres puntos (⋯) al final de la fila. Al hacer clic se despliegan las opciones disponibles para ese usuario. Las opciones disponibles varían según el contexto:

- **Cambiar rol** — Cambia el nivel de acceso del usuario.
- **Desactivar cuenta / Activar cuenta** — Suspende o reactiva el acceso.
- **Eliminar usuario** — Elimina permanentemente la cuenta.

> **Limitación de seguridad:** No verá opciones de acción en su propia fila. El sistema impide que un administrador modifique o elimine su propia cuenta para evitar quedar sin acceso.

---

### 6.2 Invitar a un Nuevo Usuario

1. En el panel de Usuarios, haga clic en el botón **"Invitar usuario"** (esquina superior derecha).
2. Complete el formulario de invitación:

| Campo | Obligatorio | Descripción |
|---|---|---|
| Correo electrónico | **Sí** | Dirección donde se enviará la invitación |
| Nombre completo | No | Nombre visible del usuario en el sistema |
| Rol | **Sí** | Nivel de acceso: EMPLEADO o CONTADOR |

> **Nombre opcional:** Si no ingresa un nombre, el sistema usará automáticamente la parte del correo antes del "@" como nombre de display. Por ejemplo, si el correo es `juan.perez@empresa.com`, el nombre será `juan.perez`.

3. Haga clic en **"Enviar invitación"**.
4. El sistema creará la cuenta del usuario y le enviará un correo electrónico con sus credenciales de acceso iniciales.
5. Verá una pantalla de confirmación con el mensaje "¡Invitación enviada!".

#### ¿Qué recibe el usuario invitado?

El nuevo usuario recibirá un correo con:
- La dirección web de acceso a Expensly
- Su correo electrónico como usuario
- Una contraseña temporal generada automáticamente

Se recomienda indicarle al usuario que cambie su contraseña tras el primer inicio de sesión.

---

### 6.3 Cambiar el Rol de un Usuario

1. En la tabla de usuarios, haga clic en el menú **⋯** del usuario que desea modificar.
2. Seleccione **"Cambiar rol"**.
3. En el modal que aparece, seleccione el nuevo rol deseado:
   - **EMPLEADO:** Acceso solo a registrar y ver sus propias facturas.
   - **CONTADOR:** Acceso al panel de auditoría y exportación.
4. Confirme el cambio haciendo clic en **"Guardar cambios"**.

El cambio toma efecto de inmediato. La próxima vez que el usuario inicie sesión, verá únicamente las secciones correspondientes a su nuevo rol.

> **Restricción:** No es posible asignar el rol SUPERADMIN a otros usuarios desde el panel. Este rol solo se asigna al creador de la organización durante el onboarding.

---

### 6.4 Activar o Desactivar un Usuario

Desactivar un usuario es útil cuando un empleado está de baja temporal o cuando se necesita suspender su acceso sin eliminar su historial de facturas.

#### Desactivar un usuario

1. En la tabla, haga clic en el menú **⋯** del usuario.
2. Seleccione **"Desactivar cuenta"**.
3. Confirme la acción en el modal de confirmación.

El usuario aparecerá con estado **Inactivo** (indicador gris). A partir de ese momento, si el usuario intenta iniciar sesión, verá el mensaje "Cuenta desactivada" y no podrá acceder.

#### Reactivar un usuario

1. En la tabla, haga clic en el menú **⋯** del usuario inactivo.
2. Seleccione **"Activar cuenta"**.
3. Confirme la acción.

El usuario recuperará acceso inmediatamente.

---

### 6.5 Eliminar un Usuario

> **Esta acción es permanente.** La cuenta del usuario se eliminará definitivamente. Sin embargo, todas las facturas que haya registrado permanecerán en el sistema para garantizar la integridad del registro contable.

1. En la tabla, haga clic en el menú **⋯** del usuario que desea eliminar.
2. Seleccione **"Eliminar usuario"**.
3. El sistema mostrará un modal de confirmación advirtiendo sobre el carácter permanente de la acción.
4. Haga clic en **"Sí, eliminar"** para confirmar.

#### Protecciones del sistema al eliminar usuarios

El sistema tiene las siguientes restricciones para proteger la integridad de la organización:

| Restricción | Mensaje que verá |
|---|---|
| Intentar eliminar su propia cuenta | Opción no disponible en su propia fila |
| Intentar eliminar al otro administrador | "No es posible eliminar a otro administrador" |

---

## 7. PREGUNTAS FRECUENTES (FAQ)

### ¿Qué pasa si la factura no tiene código QR?

No hay problema. Si el sistema no detecta un código QR en las imágenes, automáticamente utilizará Inteligencia Artificial (Azure Document Intelligence) para leer el texto de la factura y extraer los datos. La calidad del resultado dependerá de la nitidez de la fotografía.

### ¿Puedo subir el respaldo físico de una factura en partes?

Sí. Si la factura es larga o no cabe en una foto, puede subir hasta 10 imágenes para una misma factura. El sistema las procesa en conjunto y combina la información de todas.

### ¿Por qué algunos campos del formulario quedaron vacíos o incorrectos?

Esto puede ocurrir si:
- La imagen está borrosa, recortada o tiene poca iluminación.
- El texto de la factura es de muy baja resolución.
- El proveedor usa un formato de factura poco común.

En cualquier caso, puede **editar los campos manualmente** antes de guardar. El formulario es completamente editable.

### ¿Qué significa que una factura está "Pendiente"?

Una factura en estado Pendiente fue guardada correctamente y está esperando ser revisada por un Contador o Administrador de su organización. No se requiere ninguna acción de su parte.

### ¿Puedo editar una factura después de guardarla?

En la versión actual del MVP, la edición de facturas ya guardadas no está disponible desde la interfaz de usuario. Si necesita corregir una factura, comuníqueselo a su administrador.

### ¿Los datos de mi empresa son visibles para otras empresas?

No. Expensly es un sistema multi-tenant con aislamiento completo de datos. Un usuario de otra organización no puede ver, buscar ni acceder a ningún dato de su empresa, independientemente de cómo intente hacerlo.

### ¿Qué sucede con las facturas si un empleado es eliminado?

Las facturas registradas por ese empleado se conservan en el sistema con todos sus datos intactos. Esto garantiza que el historial contable de su organización permanezca completo. Las facturas simplemente dejarán de mostrar el nombre del empleado.

### ¿Puede un empleado ver las facturas de sus compañeros?

No. Un usuario con rol EMPLEADO única y exclusivamente puede ver las facturas que él mismo ha registrado. Las facturas de otros empleados son invisibles para él.

### ¿Qué pasa si el enlace de recuperación de contraseña expiró?

Los enlaces de recuperación tienen una vigencia de 60 minutos. Si su enlace expiró, vuelva a la pantalla de inicio de sesión, haga clic en **"¿Olvidaste tu contraseña?"** y solicite un nuevo enlace.

### ¿Puedo tener el mismo correo electrónico en dos organizaciones distintas?

No. En la versión actual, cada dirección de correo electrónico es única en todo el sistema. Un correo solo puede pertenecer a una organización.

---

## 8. MENSAJES DE ERROR COMUNES

Esta sección explica los mensajes de error que puede encontrar al usar el sistema y cómo resolverlos.

### Errores de autenticación

| Mensaje | Causa | Solución |
|---|---|---|
| "Credenciales inválidas" | El correo o la contraseña son incorrectos | Verifique que esté escribiendo el correo exacto (sin espacios) y la contraseña correcta |
| "Cuenta desactivada" | Su cuenta fue suspendida por el administrador | Contacte al administrador de su organización |
| "Su sesión ha expirado" | El token de sesión venció (después de 24 horas de inactividad) | Inicie sesión nuevamente |
| "No autorizado" | Intento de acceder a una sección sin los permisos necesarios | Verifique que su rol tiene acceso a esa sección |

### Errores al registrar una factura

| Mensaje | Causa | Solución |
|---|---|---|
| "El archivo supera el límite de 5 MB" | La imagen es demasiado grande | Reduzca el tamaño de la imagen o tome una foto con menor resolución |
| "Tipo de archivo no válido" | Se intentó subir un PDF, Word u otro formato no soportado | Convierta el documento a imagen (JPG o PNG) antes de subirlo |
| "Máximo 10 imágenes por factura" | Se intentaron agregar más de 10 archivos | Seleccione solo las imágenes necesarias (máximo 10) |
| "Error al procesar la factura" | El servicio de OCR no pudo analizar las imágenes | Intente con una fotografía más nítida o con mejor iluminación |
| "Error al guardar la factura" | Problema de conexión con el servidor | Verifique su conexión a internet e intente nuevamente |

### Errores en la gestión de usuarios

| Mensaje | Causa | Solución |
|---|---|---|
| "El correo ya está en uso" | Se intentó invitar un correo que ya existe en el sistema | Use una dirección de correo diferente |
| "No puedes eliminar tu propia cuenta" | Se intentó eliminar la cuenta con la que está autenticado | Esta acción no está permitida por diseño |
| "No es posible eliminar a otro administrador" | Se intentó eliminar a un usuario con rol SUPERADMIN | Solo se puede eliminar usuarios con rol EMPLEADO o CONTADOR |

### Errores generales

| Mensaje | Causa | Solución |
|---|---|---|
| "Error inesperado" | Fallo interno del servidor | Espere unos minutos e intente la acción nuevamente. Si el error persiste, contacte soporte |
| Página en blanco o "404 — Página no encontrada" | La URL ingresada no existe | Verifique la dirección web o regrese al inicio usando el botón correspondiente |

---

*Manual de Usuario preparado por el equipo de desarrollo de Expensly.*
*Versión MVP 1.0.0 — Rama `main` — 1 de marzo de 2026*
