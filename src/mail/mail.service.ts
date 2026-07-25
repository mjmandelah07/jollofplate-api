import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;

  constructor(private readonly config: ConfigService) {
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host: this.config.get<string>('SMTP_HOST') ?? 'smtp.gmail.com',
        port: Number(this.config.get<string>('SMTP_PORT') ?? 587),
        secure: false,
        auth: { user, pass },
      });
    } else {
      this.transporter = null;
      this.logger.warn(
        'SMTP_USER / SMTP_PASS not set — verification emails will be logged only',
      );
    }
  }

  async sendEmailVerification(params: {
    to: string;
    firstName: string;
    verifyUrl: string;
  }) {
    const subject = 'Verify your JollofPlate email';
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto;">
        <h1 style="color: #C0392B;">JollofPlate</h1>
        <p>Hi ${params.firstName},</p>
        <p>Thanks for signing up. Please verify your email to secure your account.</p>
        <p style="margin: 28px 0;">
          <a href="${params.verifyUrl}"
             style="background:#C0392B;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
            Verify email
          </a>
        </p>
        <p style="color:#666;font-size:14px;">Or copy this link:<br/>${params.verifyUrl}</p>
        <p style="color:#666;font-size:14px;">This link expires in 24 hours.</p>
      </div>
    `;
    const text = `Hi ${params.firstName},\n\nVerify your JollofPlate email:\n${params.verifyUrl}\n\nThis link expires in 24 hours.`;

    await this.send({ to: params.to, subject, html, text });
  }

  private async send(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }) {
    const smtpUser = this.config.get<string>('SMTP_USER');
    const from =
      this.config.get<string>('MAIL_FROM') ??
      (smtpUser ? `JollofPlate <${smtpUser}>` : 'JollofPlate <noreply@localhost>');

    if (!this.transporter) {
      this.logger.log(
        `[dev mail] To: ${params.to} | Subject: ${params.subject}\n${params.text}`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown mail error';
      this.logger.error(`Failed to send email to ${params.to}: ${message}`);
      throw error;
    }
  }
}
