/*
  Warnings:

  - You are about to drop the column `imagePublicId` on the `facturas` table. All the data in the column will be lost.
  - You are about to drop the column `url_imagen` on the `facturas` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "facturas" DROP COLUMN "imagePublicId",
DROP COLUMN "url_imagen";

-- CreateTable
CREATE TABLE "factura_imagenes" (
    "id" UUID NOT NULL,
    "factura_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "imagePublicId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "factura_imagenes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "factura_imagenes_factura_id_orden_key" ON "factura_imagenes"("factura_id", "orden");

-- AddForeignKey
ALTER TABLE "factura_imagenes" ADD CONSTRAINT "factura_imagenes_factura_id_fkey" FOREIGN KEY ("factura_id") REFERENCES "facturas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
