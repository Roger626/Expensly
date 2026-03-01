import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * MailModule
 * Configura el transporte SMTP de Gmail usando las variables
 * MAIL_USER y MAIL_PASS del archivo .env.
 *
 * Para Gmail necesitas una "App Password" (contraseña de aplicación):
 *   Google Account → Seguridad → Verificación en 2 pasos →
 *   Contraseñas de aplicaciones → generar una para "Expensly".
 */
@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,        // TLS (STARTTLS)
          auth: {
            user: config.get<string>('MAIL_USER'),
            pass: config.get<string>('MAIL_PASS'),
          },
        },
        defaults: {
          from: `"Expensly" <${config.get<string>('MAIL_USER')}>`,
        },
      }),
    }),
  ],
  exports: [MailerModule],   // Los módulos que importen MailModule pueden usar MailerService
})
export class MailModule {}
