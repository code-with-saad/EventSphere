import { Resend } from 'resend';
import env from '../config/env';

/**
 * Email Service Class
 * Handles email delivery using Resend API
 */
export class EmailService {
  private resend: Resend;
  private fromEmail: string;

  constructor() {
    // Initialize Resend client with API key from environment
    this.resend = new Resend(env.RESEND_API_KEY);
    // Use a default from address (can be configured in env later)
    this.fromEmail = 'EventSphere <onboarding@resend.dev>';
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

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: subject,
        html: html,
        text: text,
      });

      // Log success (without sensitive data)
      console.log(`OTP email sent successfully to ${email} for ${purpose}. Message ID: ${result.data?.id}`);

      return true;
    } catch (error) {
      // Log error with details
      console.error(`Failed to send OTP email to ${email} for ${purpose}:`, error);
      
      // Re-throw error to be handled by the caller
      throw new Error('Failed to send OTP email. Please try again later.');
    }
  }

  /**
   * Generate email content based on purpose
   * @param otp - 6-digit OTP code
   * @param purpose - Purpose of the OTP
   * @returns Object containing subject, html, and text content
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
      color: #64748b;
      font-size: 14px;
      border-top: 1px solid #e2e8f0;
    }
    .footer a {
      color: #10b981;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 EventSphere</h1>
    </div>
    <div class="content">
      <p class="message">Hello,</p>
      <p class="message">Thank you for registering with EventSphere! To complete your registration and activate your account, please use the verification code below:</p>
      
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
        <div class="expiry-note">⏱️ This code expires in 5 minutes</div>
      </div>

      <p class="message">If you didn't request this code, please ignore this email and your account will remain inactive.</p>
      
      <p class="message">Welcome to EventSphere!<br>The EventSphere Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message, please do not reply to this email.</p>
      <p>&copy; 2024 EventSphere. All rights reserved.</p>
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
Hello,

Thank you for registering with EventSphere! Your verification code is:

${otp}

This code expires in 5 minutes.

If you didn't request this code, please ignore this email.

Welcome to EventSphere!

Best regards,
EventSphere Team

---
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
    .security-notice {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .security-notice p {
      margin: 0;
      color: #92400e;
      font-size: 14px;
    }
    .footer {
      background-color: #f8fafc;
      padding: 20px 30px;
      text-align: center;
      color: #64748b;
      font-size: 14px;
      border-top: 1px solid #e2e8f0;
    }
    .footer a {
      color: #6366f1;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 EventSphere</h1>
    </div>
    <div class="content">
      <p class="message">Hello,</p>
      <p class="message">We received a request to reset your EventSphere password. To proceed with the password reset, please use the verification code below:</p>
      
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
        <div class="expiry-note">⏱️ This code expires in 5 minutes</div>
      </div>

      <div class="security-notice">
        <p>⚠️ <strong>Security Notice:</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
      </div>
      
      <p class="message">Best regards,<br>The EventSphere Team</p>
    </div>
    <div class="footer">
      <p>This is an automated message, please do not reply to this email.</p>
      <p>&copy; 2024 EventSphere. All rights reserved.</p>
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
Hello,

We received a request to reset your EventSphere password. Your password reset code is:

${otp}

This code expires in 5 minutes.

SECURITY NOTICE: If you didn't request a password reset, please ignore this email and your password will remain unchanged.

Best regards,
EventSphere Team

---
This is an automated message, please do not reply to this email.
    `.trim();
  }
  /**
   * Send notification when an exhibitor's application is approved or rejected
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
        ? `Application Approved: ${companyName} at ${expoName}`
        : `Application Update: ${companyName} at ${expoName}`;

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

      await this.resend.emails.send({
        from: this.fromEmail,
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

      await this.resend.emails.send({
        from: this.fromEmail,
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

      await this.resend.emails.send({
        from: this.fromEmail,
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
