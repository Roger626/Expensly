import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailService } from './mail.service';

/**
 * MailModule
 * Proporciona MailService, que envía correos mediante la API HTTP de Resend.
 *
 * Render bloquea los puertos SMTP salientes (25, 465, 587). Resend resuelve
 * esto usando HTTPS (puerto 443), que nunca está bloqueado en producción.
 *
 * Variables de entorno necesarias:
 *   RESEND_API_KEY  →  https://resend.com/api-keys
 *   MAIL_FROM       →  "Expensly <noreply@tudominio.com>"
 */
@Module({
  imports: [ConfigModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
