import { hashPassword, comparePassword, validatePassword, isPasswordValid } from './password.utils';

/**
 * Unit tests for password utilities
 * Run with: npx ts-node src/utils/password.utils.test.ts
 */

async function runTests() {
  console.log('🧪 Running Password Utilities Tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Hash password produces valid bcrypt hash
  try {
    const password = 'TestPassword123';
    const hash = await hashPassword(password);
    
    if (hash && hash.length === 60 && hash.startsWith('$2b$')) {
      console.log('✅ Test 1: Hash password produces valid bcrypt hash');
      passed++;
    } else {
      console.log('❌ Test 1 FAILED: Invalid bcrypt hash format');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 1 FAILED:', error);
    failed++;
  }
  
  // Test 2: Same password produces different hashes (salt verification)
  try {
    const password = 'TestPassword123';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    
    if (hash1 !== hash2) {
      console.log('✅ Test 2: Same password produces different hashes (salt working)');
      passed++;
    } else {
      console.log('❌ Test 2 FAILED: Same password produced identical hashes');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 2 FAILED:', error);
    failed++;
  }
  
  // Test 3: Compare password succeeds for correct password
  try {
    const password = 'CorrectPassword456';
    const hash = await hashPassword(password);
    const isMatch = await comparePassword(password, hash);
    
    if (isMatch === true) {
      console.log('✅ Test 3: Compare password succeeds for correct password');
      passed++;
    } else {
      console.log('❌ Test 3 FAILED: Correct password did not match');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 3 FAILED:', error);
    failed++;
  }
  
  // Test 4: Compare password fails for incorrect password
  try {
    const password = 'CorrectPassword456';
    const wrongPassword = 'WrongPassword789';
    const hash = await hashPassword(password);
    const isMatch = await comparePassword(wrongPassword, hash);
    
    if (isMatch === false) {
      console.log('✅ Test 4: Compare password fails for incorrect password');
      passed++;
    } else {
      console.log('❌ Test 4 FAILED: Wrong password matched');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 4 FAILED:', error);
    failed++;
  }
  
  // Test 5: Validate password rejects short passwords
  try {
    const shortPassword = '1234567'; // 7 characters
    const result = validatePassword(shortPassword);
    
    if (!result.isValid && result.error?.includes('at least 8 characters')) {
      console.log('✅ Test 5: Validate password rejects passwords < 8 characters');
      passed++;
    } else {
      console.log('❌ Test 5 FAILED: Short password was accepted');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 5 FAILED:', error);
    failed++;
  }
  
  // Test 6: Validate password accepts valid passwords
  try {
    const validPassword = 'ValidPass123';
    const result = validatePassword(validPassword);
    
    if (result.isValid && !result.error) {
      console.log('✅ Test 6: Validate password accepts valid passwords (8+ chars)');
      passed++;
    } else {
      console.log('❌ Test 6 FAILED: Valid password was rejected');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 6 FAILED:', error);
    failed++;
  }
  
  // Test 7: Validate password rejects empty passwords
  try {
    const result = validatePassword('');
    
    if (!result.isValid && result.error?.includes('required')) {
      console.log('✅ Test 7: Validate password rejects empty passwords');
      passed++;
    } else {
      console.log('❌ Test 7 FAILED: Empty password was accepted');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 7 FAILED:', error);
    failed++;
  }
  
  // Test 8: isPasswordValid returns true for valid passwords
  try {
    const validPassword = 'ValidPass123';
    const result = isPasswordValid(validPassword);
    
    if (result === true) {
      console.log('✅ Test 8: isPasswordValid returns true for valid passwords');
      passed++;
    } else {
      console.log('❌ Test 8 FAILED: Valid password returned false');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 8 FAILED:', error);
    failed++;
  }
  
  // Test 9: isPasswordValid returns false for short passwords
  try {
    const shortPassword = 'short';
    const result = isPasswordValid(shortPassword);
    
    if (result === false) {
      console.log('✅ Test 9: isPasswordValid returns false for short passwords');
      passed++;
    } else {
      console.log('❌ Test 9 FAILED: Short password returned true');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 9 FAILED:', error);
    failed++;
  }
  
  // Test 10: Compare password handles empty inputs gracefully
  try {
    const result1 = await comparePassword('', 'somehash');
    const result2 = await comparePassword('password', '');
    
    if (result1 === false && result2 === false) {
      console.log('✅ Test 10: Compare password handles empty inputs gracefully');
      passed++;
    } else {
      console.log('❌ Test 10 FAILED: Empty inputs were not handled correctly');
      failed++;
    }
  } catch (error) {
    console.log('❌ Test 10 FAILED:', error);
    failed++;
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);
  console.log('='.repeat(50));
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed!');
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
