-- DropForeignKey
ALTER TABLE "facturas" DROP CONSTRAINT "facturas_usuario_id_fkey";

-- DropForeignKey
ALTER TABLE "logs_auditoria" DROP CONSTRAINT "logs_auditoria_usuario_id_fkey";

-- AlterTable
ALTER TABLE "facturas" ALTER COLUMN "usuario_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "logs_auditoria" ALTER COLUMN "usuario_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "facturas" ADD CONSTRAINT "facturas_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "logs_auditoria" ADD CONSTRAINT "logs_auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
