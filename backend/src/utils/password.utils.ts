import bcrypt from 'bcrypt';

/**
 * Number of salt rounds for bcrypt hashing
 * Higher values = more secure but slower
 */
const SALT_ROUNDS = 10;

/**
 * Minimum password length requirement
 */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Hash a plaintext password using bcrypt
 * 
 * @param password - The plaintext password to hash
 * @returns Promise resolving to the bcrypt hash (60 characters)
 * @throws Error if password is empty
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password) {
    throw new Error('Password cannot be empty');
  }
  
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  return hash;
}

/**
 * Compare a plaintext password with a bcrypt hash
 * Uses constant-time comparison to prevent timing attacks
 * 
 * @param password - The plaintext password to verify
 * @param hash - The bcrypt hash to compare against
 * @returns Promise resolving to true if password matches, false otherwise
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }
  
  const isMatch = await bcrypt.compare(password, hash);
  return isMatch;
}

/**
 * Validate password meets minimum security requirements
 * 
 * Requirements (Phase 1):
 * - Minimum 8 characters length
 * 
 * @param password - The password to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validatePassword(password: string): {
  isValid: boolean;
  error?: string;
} {
  if (!password) {
    return {
      isValid: false,
      error: 'Password is required'
    };
  }
  
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      isValid: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
    };
  }
  
  return {
    isValid: true
  };
}

/**
 * Validate password meets minimum length requirement (simple check)
 * 
 * @param password - The password to validate
 * @returns true if password meets minimum length, false otherwise
 */
export function isPasswordValid(password: string): boolean {
  return password && password.length >= MIN_PASSWORD_LENGTH;
}
