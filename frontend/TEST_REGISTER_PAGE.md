# RegisterPage Component Test Guide

## Test Setup

1. Ensure backend is running on `http://localhost:5000`
2. Ensure frontend is running on `http://localhost:5173`
3. Navigate to `http://localhost:5173/register`

## Manual Test Cases

### Test Case 1: Client-Side Validation

**Email Validation:**
- [ ] Leave email empty and submit → Should show "Email is required"
- [ ] Enter invalid email (e.g., "test") → Should show "Invalid email format"
- [ ] Enter valid email → Error should clear

**Password Validation:**
- [ ] Leave password empty and submit → Should show "Password is required"
- [ ] Enter password less than 8 characters (e.g., "test123") → Should show "Password must be at least 8 characters"
- [ ] Enter password with 8+ characters → Error should clear

**Full Name Validation:**
- [ ] Leave full name empty and submit → Should show "Full name is required"
- [ ] Enter single character → Should show "Full name must be at least 2 characters"
- [ ] Enter valid name → Error should clear

**Role Validation:**
- [ ] Leave role unselected and submit → Should show "Please select a role"
- [ ] Select any role → Error should clear

### Test Case 2: Registration Flow - Organizer

**Steps:**
1. Fill in all fields:
   - Email: `organizer@test.com`
   - Password: `password123`
   - Full Name: `Test Organizer`
   - Role: `Event Organizer`
2. Click "Create Account"

**Expected Result:**
- [ ] Submit button shows loading spinner during API call
- [ ] Submit button is disabled during loading
- [ ] Success toast appears: "Registration successful. Awaiting approval."
- [ ] After 2 seconds, redirects to `/login` page

### Test Case 3: Registration Flow - Exhibitor

**Steps:**
1. Fill in all fields:
   - Email: `exhibitor@test.com`
   - Password: `password123`
   - Full Name: `Test Exhibitor`
   - Role: `Exhibitor`
2. Click "Create Account"

**Expected Result:**
- [ ] Submit button shows loading spinner during API call
- [ ] Success toast appears: "OTP sent to your email. Please verify to activate your account."
- [ ] Redirects to `/verify-otp` page with email in navigation state
- [ ] Check email inbox for OTP (6-digit code)

### Test Case 4: Registration Flow - Attendee

**Steps:**
1. Fill in all fields:
   - Email: `attendee@test.com`
   - Password: `password123`
   - Full Name: `Test Attendee`
   - Role: `Attendee`
2. Click "Create Account"

**Expected Result:**
- [ ] Submit button shows loading spinner during API call
- [ ] Success toast appears: "OTP sent to your email. Please verify to activate your account."
- [ ] Redirects to `/verify-otp` page with email in navigation state
- [ ] Check email inbox for OTP (6-digit code)

### Test Case 5: Duplicate Email Error

**Steps:**
1. Register with an email that already exists (use any email from previous tests)
2. Click "Create Account"

**Expected Result:**
- [ ] Error toast appears with message: "Email already registered" (or similar backend error)
- [ ] Form remains on the page (no redirect)
- [ ] All fields retain their values

### Test Case 6: UI/UX Features

**Loading State:**
- [ ] During submission, submit button shows spinner
- [ ] During submission, submit button text changes to "Creating account..."
- [ ] During submission, all form fields are disabled
- [ ] During submission, submit button is disabled

**Navigation:**
- [ ] "Sign in" link at bottom redirects to `/login` page
- [ ] Navigation works correctly when not loading

**Styling:**
- [ ] Form is centered on the page
- [ ] BentoCard component is used (dark translucent background with border)
- [ ] Form inputs have proper focus states (emerald ring)
- [ ] Error messages appear in red below each field
- [ ] Submit button has emerald background
- [ ] All text is readable on dark background

### Test Case 7: Responsive Design

**Desktop (1024px+):**
- [ ] Form width is constrained (max-w-md)
- [ ] Form is centered horizontally
- [ ] All fields are properly sized

**Mobile (< 768px):**
- [ ] Form adapts to narrow viewport
- [ ] Form has appropriate padding on sides
- [ ] All fields remain accessible
- [ ] Touch targets are adequate

## Backend API Verification

After each registration, verify in backend:

**Organizer:**
- [ ] User created in database with `status: 'pending'`
- [ ] No OTP record created
- [ ] No email sent

**Exhibitor/Attendee:**
- [ ] User created in database with `status: 'active'`, `isEmailVerified: false`
- [ ] OTP record created in database
- [ ] OTP email sent to user's email

## Known Issues

None currently. Document any issues found during testing below:

---

## Test Results

**Date:** ___________
**Tester:** ___________
**Result:** [ ] Pass [ ] Fail

**Notes:**
