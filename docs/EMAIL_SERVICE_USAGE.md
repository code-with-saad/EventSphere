# Email Service Usage Guide

## Overview

The Email Service integrates with Resend to send OTP verification emails for user registration and password reset flows. It provides professionally styled HTML emails with fallback plain text versions.

## Setup

### 1. Install Dependencies

The Resend SDK is already installed in the project:

```bash
npm install resend
```

### 2. Configure Environment Variables

Add your Resend API key to the `.env` file:

```env
RESEND_API_KEY=re_your_actual_api_key_here
```

To get a Resend API key:
1. Sign up at [https://resend.com](https://resend.com)
2. Create a new API key in your dashboard
3. Copy the key (starts with `re_`)

### 3. Verify Configuration

The environment validation will automatically check that `RESEND_API_KEY` is set when the application starts.

## Usage

### Basic Usage

```typescript
import { createEmailService } from './services/email.service';

// Create service instance
const emailService = createEmailService();

// Send registration OTP
await emailService.sendOTPEmail(
  'user@example.com',
  '123456',
  'registration'
);

// Send password reset OTP
await emailService.sendOTPEmail(
  'user@example.com',
  '654321',
  'password_reset'
);
```

### With Error Handling

```typescript
try {
  await emailService.sendOTPEmail(
    email,
    otp,
    'registration'
  );
  console.log('OTP email sent successfully');
} catch (error) {
  console.error('Failed to send OTP email:', error);
  // Return error response to user
  return res.status(500).json({
    success: false,
    message: 'Failed to send verification email. Please try again.'
  });
}
```

### Integration with OTP Service

```typescript
import { createEmailService } from './services/email.service';
import { createOTPService } from './services/otp.service';

const emailService = createEmailService();
const otpService = createOTPService(db);

// Generate and send OTP for registration
const otp = await otpService.createOTPRecord(email, 'registration');
await emailService.sendOTPEmail(email, otp, 'registration');

// Generate and send OTP for password reset
const resetOtp = await otpService.createOTPRecord(email, 'password_reset');
await emailService.sendOTPEmail(email, resetOtp, 'password_reset');
```

## Email Templates

### Registration Email

**Subject:** Verify your EventSphere account

**Features:**
- Emerald gradient header
- Large, centered OTP code
- 5-minute expiry notice
- Professional styling with responsive design
- Fallback plain text version

### Password Reset Email

**Subject:** Reset your EventSphere password

**Features:**
- Indigo gradient header
- Large, centered OTP code
- 5-minute expiry notice
- Security warning if user didn't request reset
- Professional styling with responsive design
- Fallback plain text version

## Testing

### Unit Tests

Run the automated test suite:

```bash
npm test -- email.service.test.ts
```

Tests cover:
- Email sending for both purposes
- Error handling
- Template generation
- Content validation

### Manual Testing

To test with actual email delivery:

1. Update the test email in `test-email-manual.ts`:
   ```typescript
   const TEST_EMAIL = 'your-email@example.com';
   ```

2. Ensure `RESEND_API_KEY` is set in `.env`

3. Run the manual test:
   ```bash
   npx tsx src/services/test-email-manual.ts
   ```

4. Check your inbox for both test emails

## Error Handling

The service handles errors by:
1. Logging detailed error information to the console
2. Throwing a generic user-friendly error message
3. Allowing the caller to handle the error appropriately

Example error scenarios:
- Invalid API key
- Network failures
- Rate limiting (Resend free tier: 100 emails/day)
- Invalid email addresses

## Resend Configuration

### Free Tier Limits
- 100 emails per day
- 3,000 emails per month
- "from" address: `onboarding@resend.dev` (development)

### Production Setup
1. Add and verify your own domain in Resend dashboard
2. Update the `fromEmail` in `email.service.ts`:
   ```typescript
   this.fromEmail = 'noreply@yourdomain.com';
   ```

### Rate Limiting
Consider implementing rate limiting in your API endpoints:
- Limit OTP requests per user (e.g., 3 per hour)
- Implement exponential backoff
- Add CAPTCHA for suspicious activity

## Requirements Satisfied

This implementation satisfies the following requirements:

- **Requirement 6.4**: OTP generation and delivery via Resend
- **Requirement 6.7**: Email service API key from environment variable
- **Design Document**: Email templates for registration and password reset
- **Error Handling**: Proper logging and user-friendly error messages

## Troubleshooting

### Issue: Emails not arriving

**Check:**
1. API key is valid and set in `.env`
2. Email address is valid
3. Check spam/junk folder
4. Verify Resend dashboard for delivery status
5. Check rate limit hasn't been exceeded

### Issue: "Failed to send OTP email" error

**Check:**
1. Network connectivity
2. Resend API status: [https://resend.com/status](https://resend.com/status)
3. Console logs for detailed error messages
4. API key permissions

### Issue: Emails in spam folder

**Solutions:**
1. Use a verified domain (not `resend.dev`)
2. Add SPF and DKIM records
3. Warm up your sending reputation gradually
4. Avoid spam trigger words in content

## Next Steps

1. Add email templates for other notifications (approval, rejection)
2. Implement email queue for better reliability
3. Add retry logic for failed sends
4. Track email delivery status
5. Implement unsubscribe functionality (required for production)
