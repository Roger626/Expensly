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
        port: 465,
        secure: true,
        auth: {
          user: config.get<string>('MAIL_USER'),
          pass: config.get<string>('MAIL_PASS'),
        },
        // Opciones de robustez para Render/Cloud
        pool: true,             // Usar pool de conexiones para evitar re-conectar en cada envío
        maxConnections: 5,      // Limitar concurrencia
        maxMessages: 100,       // Reiniciar conexión cada 100 mensajes
        tls: {
          rejectUnauthorized: false // ¡CRÍTICO! Desactivar estrictos checks de certificado en entornos restringidos como Render
        },
        logger: true, // Logs detallados de SMTP en la consola
        debug: true,   // Debug mode para ver el handshake completo
        family: 4      // ¡FUERZA IPv4! Render a veces falla resolviendo IPv6 con Gmail
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
