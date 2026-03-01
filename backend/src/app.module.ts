import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { RegistroGastosModule } from './modules/registro-gastos/registro-gastos.module';
import { MailModule } from './infrastructure/mail/mail.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    MailModule,
    AuthModule,
    RegistroGastosModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
