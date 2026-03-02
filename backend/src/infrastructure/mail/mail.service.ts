import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

/**
 * MailService
 * Envía correos usando la API HTTP de Resend (https://resend.com).
 *
 * Por qué no SMTP:
 *  Render (y la mayoría de plataformas PaaS) bloquea los puertos SMTP salientes
 *  (25, 465, 587) para evitar abusos. Resend usa HTTPS (puerto 443) por lo que
 *  siempre puede alcanzar su API.
 *
 * Variable de entorno requerida:
 *  RESEND_API_KEY  →  se obtiene en https://resend.com/api-keys
 *  MAIL_FROM       →  dirección verificada, ej. "Expensly <noreply@tudominio.com>"
 *                     (si no tienes dominio propio, usa "onboarding@resend.dev" sólo para pruebas)
 */
@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly from: string;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      throw new Error('RESEND_API_KEY must be defined in environment variables');
    }

    this.resend = new Resend(apiKey);

    this.from = config.get<string>('MAIL_FROM') ?? 'Expensly <onboarding@resend.dev>';
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    const to = Array.isArray(options.to) ? options.to : [options.to];

    const { error } = await this.resend.emails.send({
      from:    this.from,
      to,
      subject: options.subject,
      html:    options.html,
    });

    if (error) {
      this.logger.error(`Error sending email to ${to.join(', ')}: ${error.message}`);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    this.logger.log(`Email "${options.subject}" sent to ${to.join(', ')}`);
  }
}
