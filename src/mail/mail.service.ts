import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;

  constructor(private readonly config: ConfigService) {
    const user = this.config.get<string>('SMTP_USER')?.trim();
    // Gmail app passwords are often pasted with spaces — strip them.
    const pass = this.config.get<string>('SMTP_PASS')?.replace(/\s+/g, '');

    if (user && pass) {
      const port = Number(this.config.get<string>('SMTP_PORT') ?? 465);
      const secureEnv = this.config.get<string>('SMTP_SECURE');
      const useSecure =
        secureEnv != null ? secureEnv === 'true' : port === 465;

      // Prefer port 465 (SSL). Port 587 often fails when IPv6 to Gmail is unreachable.
      this.transporter = nodemailer.createTransport({
        host: this.config.get<string>('SMTP_HOST') ?? 'smtp.gmail.com',
        port,
        secure: useSecure,
        auth: { user, pass },
        connectionTimeout: 12_000,
        greetingTimeout: 12_000,
        socketTimeout: 20_000,
      } satisfies SMTPTransport.Options);
      this.logger.log(
        `SMTP ready (${user} @ port ${port}, secure=${useSecure})`,
      );
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
    const name = escapeHtml(params.firstName.trim() || 'there');
    const subject = 'Confirm your JollofPlate account';
    const html = `
      <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 520px; margin: 0 auto; color: #222;">
        <p style="font-size: 20px; font-weight: 700; color: #C0392B; margin: 0 0 16px;">JollofPlate</p>
        <p>Hi ${name},</p>
        <p>Someone just created a JollofPlate account with this email address (${escapeHtml(params.to)}). If that was you, confirm it here:</p>
        <p style="margin: 24px 0;">
          <a href="${params.verifyUrl}">Confirm my email</a>
        </p>
        <p style="color:#555;font-size:14px;line-height:1.5;">If the link does not work, paste this URL into your browser:<br/>${escapeHtml(params.verifyUrl)}</p>
        <p style="color:#555;font-size:14px;">This link expires in 24 hours. If you did not sign up, you can ignore this message.</p>
        <p style="color:#888;font-size:12px;margin-top:28px;">JollofPlate · Account confirmation (not marketing)</p>
      </div>
    `;
    const text = [
      `Hi ${params.firstName.trim() || 'there'},`,
      '',
      `Someone created a JollofPlate account with ${params.to}.`,
      'If that was you, confirm your email by opening this link:',
      params.verifyUrl,
      '',
      'This link expires in 24 hours. If you did not sign up, ignore this message.',
      '',
      'JollofPlate — account confirmation',
    ].join('\n');

    await this.send({ to: params.to, subject, html, text });
  }

  private async send(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }) {
    const smtpUser = this.config.get<string>('SMTP_USER')?.trim();
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
      const info = await this.transporter.sendMail({
        from,
        replyTo: smtpUser ?? from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        // Helps some filters treat this as 1:1 transactional mail, not a blast.
        headers: {
          'X-Entity-Ref-ID': `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        },
      });
      this.logger.log(
        `Email sent to ${params.to} (messageId=${info.messageId ?? 'n/a'})`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown mail error';
      this.logger.error(`Failed to send email to ${params.to}: ${message}`);
      throw error;
    }
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
