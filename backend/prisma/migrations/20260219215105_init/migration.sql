-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('SUPERADMIN', 'CONTADOR', 'EMPLEADO');

-- CreateEnum
CREATE TYPE "EstadoFactura" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateTable
CREATE TABLE "categorias" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "codigo_contable" VARCHAR(50),

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "factura_tags" (
    "factura_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,

    CONSTRAINT "factura_tags_pkey" PRIMARY KEY ("factura_id","tag_id")
);

-- CreateTable
CREATE TABLE "facturas" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "categoria_id" UUID,
    "monto_total" DECIMAL(12,2) NOT NULL,
    "itbms" DECIMAL(12,2) DEFAULT 0.00,
    "fecha_emision" DATE NOT NULL,
    "ruc_proveedor" VARCHAR(50),
    "nombre_proveedor" VARCHAR(255),
    "numero_factura" VARCHAR(255) NOT NULL,
    "cufe" VARCHAR(255),
    "url_imagen" TEXT NOT NULL,
    "imagePublicId" TEXT NOT NULL,
    "estado" VARCHAR(20) DEFAULT 'PENDIENTE',
    "motivo_rechazo" TEXT,
    "fecha_subida" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_auditoria" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "accion" VARCHAR(100) NOT NULL,
    "detalle" JSONB,
    "fecha" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizaciones" (
    "id" UUID NOT NULL,
    "razon_social" VARCHAR(255) NOT NULL,
    "ruc" VARCHAR(50) NOT NULL,
    "dv" VARCHAR(10) NOT NULL,
    "plan_suscripcion" VARCHAR(50) DEFAULT 'Trial',
    "fecha_registro" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "token_id" VARCHAR(255) NOT NULL,
    "expira_en" TIMESTAMPTZ(6) NOT NULL,
    "creado_en" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "color" VARCHAR(7) DEFAULT '#000000',

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "organizacion_id" UUID NOT NULL,
    "nombre_completo" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "rol" "RolUsuario" NOT NULL DEFAULT 'EMPLEADO',
    "activo" BOOLEAN DEFAULT true,
    "fecha_creacion" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categorias_organizacion_id_nombre_key" ON "categorias"("organizacion_id", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "organizaciones_ruc_key" ON "organizaciones"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "factura_tags" ADD CONSTRAINT "factura_tags_factura_id_fkey" FOREIGN KEY ("factura_id") REFERENCES "facturas"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "factura_tags" ADD CONSTRAINT "factura_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "logs_auditoria" ADD CONSTRAINT "logs_auditoria_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizaciones"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "logs_auditoria" ADD CONSTRAINT "logs_auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_organizacion_id_fkey" FOREIGN KEY ("organizacion_id") REFERENCES "organizaciones"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
