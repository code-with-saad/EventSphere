import nodemailer, { Transporter } from 'nodemailer';
import { Resend } from 'resend';
import env from '../config/env';

/**
 * Email Service Class
 * Handles email delivery using SMTP (Gmail / Custom SMTP) or Resend API fallback.
 */
export class EmailService {
  private transporter: Transporter | null = null;
  private resend: Resend | null = null;
  private fromEmail: string;

  constructor() {
    this.fromEmail = env.SMTP_FROM || (env.SMTP_USER ? `EventSphere <${env.SMTP_USER}>` : 'EventSphere <onboarding@resend.dev>');

    // 1. If SMTP credentials (such as Gmail) are provided, configure Nodemailer transporter
    if (env.SMTP_USER && env.SMTP_PASS) {
      if (env.SMTP_HOST) {
        this.transporter = nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT ? Number(env.SMTP_PORT) : 587,
          secure: env.SMTP_PORT === '465',
          auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          },
        });
      } else {
        // Default to Gmail service
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          },
        });
      }
      console.log(`✔ EmailService configured with SMTP (${env.SMTP_USER})`);
    } else if (env.RESEND_API_KEY) {
      // 2. Fallback to Resend API if configured
      this.resend = new Resend(env.RESEND_API_KEY);
      console.log('✔ EmailService configured with Resend API');
    } else {
      console.warn('⚠ EmailService initialized without SMTP or Resend credentials (console fallback active).');
    }
  }

  /**
   * Internal helper to dispatch email through the active transport
   */
  private async _sendMail(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<boolean> {
    const { to, subject, html, text } = options;

    if (this.transporter) {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to,
        subject,
        html,
        text,
      });
      return true;
    }

    if (this.resend) {
      await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html,
        text,
      });
      return true;
    }

    // Console fallback if no transport is configured in development
    console.log(`\n[EMAIL LOG (No SMTP configured)]\nTo: ${to}\nSubject: ${subject}\nText:\n${text}\n`);
    return true;
  }

  /**
   * Send OTP email for registration or password reset
   * @param email - Recipient email address
   * @param otp - 6-digit OTP code
   * @param purpose - Purpose of the OTP ('registration' or 'password_reset')
   * @returns Promise resolving to true if email sent successfully
   * @throws Error if email send fails
   */
  async sendOTPEmail(
    email: string,
    otp: string,
    purpose: 'registration' | 'password_reset'
  ): Promise<boolean> {
    try {
      const { subject, html, text } = this.generateEmailContent(otp, purpose);

      await this._sendMail({
        to: email,
        subject,
        html,
        text,
      });

      console.log(`OTP email sent successfully to ${email} for ${purpose}.`);
      return true;
    } catch (error) {
      console.error(`Failed to send OTP email to ${email} for ${purpose}:`, error);
      throw new Error('Failed to send OTP email. Please try again later.');
    }
  }

  /**
   * Generate email content based on purpose
   */
  private generateEmailContent(
    otp: string,
    purpose: 'registration' | 'password_reset'
  ): { subject: string; html: string; text: string } {
    if (purpose === 'registration') {
      return {
        subject: 'Verify your EventSphere account',
        html: this.getRegistrationEmailHTML(otp),
        text: this.getRegistrationEmailText(otp),
      };
    } else {
      return {
        subject: 'Reset your EventSphere password',
        html: this.getPasswordResetEmailHTML(otp),
        text: this.getPasswordResetEmailText(otp),
      };
    }
  }

  /**
   * Get HTML content for registration OTP email
   */
  private getRegistrationEmailHTML(otp: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your EventSphere account</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #334155;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff;
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .otp-box {
      background-color: #f1f5f9;
      border: 2px dashed #cbd5e1;
      border-radius: 8px;
      padding: 30px;
      text-align: center;
      margin: 30px 0;
    }
    .otp-code {
      font-size: 36px;
      font-weight: 700;
      color: #10b981;
      letter-spacing: 8px;
      margin: 10px 0;
    }
    .expiry-note {
      color: #64748b;
      font-size: 14px;
      margin-top: 10px;
    }
    .message {
      color: #475569;
      font-size: 16px;
      line-height: 1.8;
      margin-bottom: 20px;
    }
    .footer {
      background-color: #f8fafc;
      padding: 20px 30px;
      text-align: center;
      font-size: 14px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
    }
    .warning {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      margin: 20px 0;
      border-radius: 4px;
      font-size: 14px;
      color: #92400e;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>EventSphere</h1>
    </div>
    <div class="content">
      <p class="message">Hello,</p>
      <p class="message">Thank you for registering with EventSphere! To complete your account verification, please enter the following One-Time Password (OTP):</p>
      
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
        <div class="expiry-note">⏱ This code will expire in <strong>10 minutes</strong></div>
      </div>

      <div class="warning">
        <strong>Security Notice:</strong> Never share this code with anyone. EventSphere support will never ask for your OTP.
      </div>

      <p class="message">If you did not request this registration, please safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} EventSphere. All rights reserved.</p>
      <p>This is an automated message, please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Get plain text content for registration OTP email
   */
  private getRegistrationEmailText(otp: string): string {
    return `
EventSphere - Account Verification

Hello,

Thank you for registering with EventSphere! To complete your account verification, please use the following One-Time Password (OTP):

${otp}

This code will expire in 10 minutes.

Security Notice: Never share this code with anyone. EventSphere support will never ask for your OTP.

If you did not request this registration, please safely ignore this email.

---
© ${new Date().getFullYear()} EventSphere. All rights reserved.
This is an automated message, please do not reply to this email.
    `.trim();
  }

  /**
   * Get HTML content for password reset OTP email
   */
  private getPasswordResetEmailHTML(otp: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your EventSphere password</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #334155;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: #ffffff;
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .otp-box {
      background-color: #f1f5f9;
      border: 2px dashed #cbd5e1;
      border-radius: 8px;
      padding: 30px;
      text-align: center;
      margin: 30px 0;
    }
    .otp-code {
      font-size: 36px;
      font-weight: 700;
      color: #6366f1;
      letter-spacing: 8px;
      margin: 10px 0;
    }
    .expiry-note {
      color: #64748b;
      font-size: 14px;
      margin-top: 10px;
    }
    .message {
      color: #475569;
      font-size: 16px;
      line-height: 1.8;
      margin-bottom: 20px;
    }
    .footer {
      background-color: #f8fafc;
      padding: 20px 30px;
      text-align: center;
      font-size: 14px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
    }
    .warning {
      background-color: #fee2e2;
      border-left: 4px solid #ef4444;
      padding: 12px 16px;
      margin: 20px 0;
      border-radius: 4px;
      font-size: 14px;
      color: #991b1b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>EventSphere</h1>
    </div>
    <div class="content">
      <p class="message">Hello,</p>
      <p class="message">We received a request to reset your password. Please enter the following One-Time Password (OTP) to proceed with resetting your password:</p>
      
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
        <div class="expiry-note">⏱ This code will expire in <strong>10 minutes</strong></div>
      </div>

      <div class="warning">
        <strong>Security Notice:</strong> If you did not request a password reset, please change your password immediately and contact support.
      </div>

      <p class="message">Do not share this code with anyone.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} EventSphere. All rights reserved.</p>
      <p>This is an automated message, please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Get plain text content for password reset OTP email
   */
  private getPasswordResetEmailText(otp: string): string {
    return `
EventSphere - Password Reset

Hello,

We received a request to reset your password. Please use the following One-Time Password (OTP) to proceed:

${otp}

This code will expire in 10 minutes.

Security Notice: If you did not request a password reset, please change your password immediately and contact support. Never share this code with anyone.

---
© ${new Date().getFullYear()} EventSphere. All rights reserved.
This is an automated message, please do not reply to this email.
    `.trim();
  }

  /**
   * Send notification when an exhibitor application is approved or rejected
   */
  async sendApplicationStatusEmail(
    email: string,
    companyName: string,
    expoName: string,
    status: 'approved' | 'rejected',
    reasonOrBooth?: string
  ): Promise<boolean> {
    try {
      const isApproved = status === 'approved';
      const subject = isApproved
        ? `Application Approved: Welcome to ${expoName}!`
        : `Update regarding your application for ${expoName}`;

      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #6366f1; margin-top: 0;">EventSphere Expo Portal</h2>
          <p>Hello <strong>${companyName}</strong>,</p>
          <p>Your exhibitor application for <strong>${expoName}</strong> has been <strong>${status.toUpperCase()}</strong>.</p>
          ${
            isApproved
              ? `<div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px; margin: 16px 0; border-radius: 4px;">
                  <p style="margin: 0; color: #166534; font-weight: bold;">🎉 Welcome to the Expo!</p>
                  ${reasonOrBooth ? `<p style="margin: 4px 0 0 0; color: #166534;">Assigned Booth: <strong>${reasonOrBooth}</strong></p>` : ''}
                </div>
                <p>Log in to your Exhibitor Dashboard to manage your booth profile and view the floor plan.</p>`
              : `<div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 16px 0; border-radius: 4px;">
                  <p style="margin: 0; color: #991b1b; font-weight: bold;">Application Status: Rejected</p>
                  ${reasonOrBooth ? `<p style="margin: 4px 0 0 0; color: #991b1b;">Reason: ${reasonOrBooth}</p>` : ''}
                </div>`
          }
          <p style="color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 24px;">
            EventSphere Automated Notifications &bull; Please do not reply directly.
          </p>
        </div>
      `.trim();

      const text = `Hello ${companyName},\n\nYour application for ${expoName} has been ${status.toUpperCase()}.\n${
        isApproved ? (reasonOrBooth ? `Booth: ${reasonOrBooth}\n` : '') : (reasonOrBooth ? `Reason: ${reasonOrBooth}\n` : '')
      }\nBest regards,\nEventSphere Team`;

      await this._sendMail({
        to: email,
        subject,
        html,
        text,
      });

      console.log(`Status email sent to ${email} for ${companyName} (${status})`);
      return true;
    } catch (error) {
      console.error(`Failed to send status email to ${email}:`, error);
      return false;
    }
  }

  /**
   * Send notification when an attendee is promoted from session waitlist to confirmed registration
   */
  async sendWaitlistPromotedEmail(
    email: string,
    attendeeName: string,
    sessionTitle: string,
    expoName: string
  ): Promise<boolean> {
    try {
      const subject = `Confirmed: You've been registered for ${sessionTitle}!`;
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #6366f1; margin-top: 0;">EventSphere Schedule Alert</h2>
          <p>Hello <strong>${attendeeName}</strong>,</p>
          <p>Great news! A spot opened up and you have been promoted from the waitlist to confirmed registration for:</p>
          <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px; margin: 16px 0; border-radius: 4px;">
            <p style="margin: 0; font-weight: bold; color: #166534;">${sessionTitle}</p>
            <p style="margin: 4px 0 0 0; color: #166534; font-size: 13px;">Expo: ${expoName}</p>
          </div>
          <p>Check your attendee dashboard under My Schedule to view session details and rooms.</p>
          <p style="color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 24px;">
            EventSphere Automated Notifications
          </p>
        </div>
      `.trim();

      const text = `Hello ${attendeeName},\n\nA spot opened up and you have been registered for "${sessionTitle}" at ${expoName}!\n\nBest regards,\nEventSphere Team`;

      await this._sendMail({
        to: email,
        subject,
        html,
        text,
      });

      console.log(`Waitlist promotion email sent to ${email} for session ${sessionTitle}`);
      return true;
    } catch (error) {
      console.error(`Failed to send waitlist promotion email to ${email}:`, error);
      return false;
    }
  }

  /**
   * Send a registration confirmation email when an attendee successfully registers for an expo
   */
  async sendTicketRegistrationEmail(
    email: string,
    attendeeName: string,
    expoName: string,
    startDate: string,
    venueName: string,
    ticketId: string
  ): Promise<boolean> {
    try {
      const subject = `🎟️ You're Registered for ${expoName}!`;
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #6366f1; margin-top: 0;">EventSphere — Registration Confirmed</h2>
          <p>Hello <strong>${attendeeName}</strong>,</p>
          <p>You're officially registered for:</p>
          <div style="background: #f0f4ff; border-left: 4px solid #6366f1; padding: 16px; margin: 16px 0; border-radius: 6px;">
            <p style="margin: 0; font-size: 18px; font-weight: bold; color: #3730a3;">${expoName}</p>
            <p style="margin: 6px 0 0 0; color: #4338ca; font-size: 14px;">📅 ${startDate}</p>
            <p style="margin: 4px 0 0 0; color: #4338ca; font-size: 14px;">📍 ${venueName}</p>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;">Your Ticket ID</p>
            <p style="margin: 0; font-family: monospace; font-size: 15px; font-weight: bold; color: #1e293b; word-break: break-all;">${ticketId}</p>
          </div>
          <p>Log in to your attendee dashboard to view your QR code for check-in, browse the session schedule, and explore exhibitor booths.</p>
          <p style="color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 24px;">
            EventSphere Automated Notifications &bull; Please do not reply directly.
          </p>
        </div>
      `.trim();

      const text = `Hello ${attendeeName},\n\nYou are registered for ${expoName}!\n\nDate: ${startDate}\nVenue: ${venueName}\nTicket ID: ${ticketId}\n\nLog in to your dashboard to view your QR code.\n\nBest regards,\nEventSphere Team`;

      await this._sendMail({ to: email, subject, html, text });
      console.log(`Ticket registration email sent to ${email} for ${expoName}`);
      return true;
    } catch (error) {
      console.error(`Failed to send ticket registration email to ${email}:`, error);
      return false;
    }
  }

  /**
   * Send notification to all ticket holders when an expo is published
   */
  async sendExpoPublishedEmail(
    email: string,
    attendeeName: string,
    expoName: string,
    startDate: string,
    venueName: string
  ): Promise<boolean> {
    try {
      const subject = `📣 ${expoName} is Now Live — You're Registered!`;
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #6366f1; margin-top: 0;">EventSphere Update</h2>
          <p>Hello <strong>${attendeeName}</strong>,</p>
          <p>Great news! The expo you registered for has officially been published and is now live:</p>
          <div style="background: #f0f4ff; border-left: 4px solid #6366f1; padding: 16px; margin: 16px 0; border-radius: 6px;">
            <p style="margin: 0; font-size: 18px; font-weight: bold; color: #3730a3;">${expoName}</p>
            <p style="margin: 6px 0 0 0; color: #4338ca; font-size: 14px;">📅 ${startDate}</p>
            <p style="margin: 4px 0 0 0; color: #4338ca; font-size: 14px;">📍 ${venueName}</p>
          </div>
          <p>Log in to your attendee dashboard to view the full schedule, exhibitor list, and floor plan.</p>
          <p style="color: #64748b; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 24px;">
            EventSphere Automated Notifications &bull; Please do not reply directly.
          </p>
        </div>
      `.trim();

      const text = `Hello ${attendeeName},\n\n${expoName} has been published!\n\nDate: ${startDate}\nVenue: ${venueName}\n\nLog in to view the full details.\n\nBest regards,\nEventSphere Team`;

      await this._sendMail({
        to: email,
        subject,
        html,
        text,
      });

      console.log(`Expo published email sent to ${email} for ${expoName}`);
      return true;
    } catch (error) {
      console.error(`Failed to send expo published email to ${email}:`, error);
      return false;
    }
  }
}

/**
 * Singleton instance of EmailService
 */
export default new EmailService();

/**
 * Factory function to create EmailService instance
 * @returns EmailService instance
 */
export function createEmailService(): EmailService {
  return new EmailService();
}
