import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * MailModule
 * Configura el transporte SMTP usando Brevo (smtp-relay.brevo.com).
 *
 * Por qué Brevo y no Gmail:
 *   Gmail bloquea conexiones SMTP desde rangos de IP de cloud providers
 *   (Render, AWS, GCP, etc.) para prevenir spam. Brevo es un relay SMTP
 *   profesional que acepta conexiones desde cualquier IP y es gratis hasta
 *   300 emails/día.
 *
 * Variables de entorno necesarias:
 *   BREVO_USER  →  tu email de cuenta Brevo (ej. roger@gmail.com)
 *   BREVO_PASS  →  SMTP key generada en Brevo (NO tu contraseña de Brevo)
 *                  Brevo Dashboard → SMTP & API → SMTP → Generate a new SMTP key
 *   MAIL_FROM   →  dirección de envío (ej. "Expensly <noreply@expensly.com>")
 */
@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: 'smtp-relay.brevo.com',
          port: 587,
          secure: false,        // STARTTLS (no SSL directo en puerto 587)
          auth: {
            user: config.get<string>('BREVO_USER'),
            pass: config.get<string>('BREVO_PASS'),
          },
        },
        defaults: {
          from: config.get<string>('MAIL_FROM') ?? `"Expensly" <${config.get<string>('BREVO_USER')}>`,
        },
      }),
    }),
  ],
  exports: [MailerModule],
})
export class MailModule {}
