/**
 * Manual test script for email service
 * Run this script to test email delivery with actual Resend API
 * 
 * Usage: tsx src/services/test-email-manual.ts
 * 
 * Prerequisites:
 * 1. Set RESEND_API_KEY in .env file
 * 2. Run: npm install tsx (if not already installed)
 * 3. Replace TEST_EMAIL with your actual email address
 */

import { createEmailService } from './email.service';
import { createOTPService } from './otp.service';
import { connectDatabase, getDatabase } from '../config/database';

const TEST_EMAIL = 'your-email@example.com'; // Replace with your actual email

async function testEmailService() {
  console.log('🚀 Testing Email Service...\n');

  try {
    // Connect to database (required for OTP service)
    console.log('📡 Connecting to database...');
    await connectDatabase();
    const db = getDatabase();
    console.log('✅ Database connected\n');

    // Create service instances
    const emailService = createEmailService();
    const otpService = createOTPService(db);

    // Test 1: Registration OTP Email
    console.log('📧 Test 1: Sending registration OTP email...');
    const registrationOTP = otpService.generateOTP();
    console.log(`Generated OTP: ${registrationOTP}`);
    
    try {
      await emailService.sendOTPEmail(TEST_EMAIL, registrationOTP, 'registration');
      console.log('✅ Registration OTP email sent successfully!');
      console.log(`Check your inbox at: ${TEST_EMAIL}\n`);
    } catch (error) {
      console.error('❌ Failed to send registration OTP email:', error);
    }

    // Wait a moment before sending next email
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Password Reset OTP Email
    console.log('📧 Test 2: Sending password reset OTP email...');
    const resetOTP = otpService.generateOTP();
    console.log(`Generated OTP: ${resetOTP}`);
    
    try {
      await emailService.sendOTPEmail(TEST_EMAIL, resetOTP, 'password_reset');
      console.log('✅ Password reset OTP email sent successfully!');
      console.log(`Check your inbox at: ${TEST_EMAIL}\n`);
    } catch (error) {
      console.error('❌ Failed to send password reset OTP email:', error);
    }

    console.log('\n✨ Email service test completed!');
    console.log('📬 Please check your email inbox for both test emails.');
    console.log('\nExpected emails:');
    console.log('1. "Verify your EventSphere account" with OTP:', registrationOTP);
    console.log('2. "Reset your EventSphere password" with OTP:', resetOTP);

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the test
testEmailService();
