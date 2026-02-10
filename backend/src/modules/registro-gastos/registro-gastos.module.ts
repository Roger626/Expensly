import { Module } from '@nestjs/common';
import { RegistroGastosService } from './services/registro-gastos.service';
import { RegistroGastosController } from './controllers/registro-gastos.controller';
import { RegistroGastosRepository } from './repositories/registro-gastos.repository';
import { ProcesarFacturaOCRStrategy } from "./strategies/factura-procesar-ocr.strategy";
import { ProcesarFacturaQRStrategy } from "./strategies/factura-procesar-qr-strategy";
import { PrismaModule } from "../../prisma/prisma.module"
import { IProcesarFacturaStrategy } from './strategies/factura-procesar.strategy.interface';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [PrismaModule, AuthModule],
    controllers: [RegistroGastosController],
    providers: [RegistroGastosService, RegistroGastosRepository, 
        ProcesarFacturaOCRStrategy, ProcesarFacturaQRStrategy,
    {
      provide: 'FACTURA_STRATEGIES',
      useFactory: (...strats: IProcesarFacturaStrategy[]) => strats,
      inject: [ProcesarFacturaQRStrategy, ProcesarFacturaOCRStrategy], 
    },]
})
export class RegistroGastosModule {}
