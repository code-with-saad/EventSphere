import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  comparePassword,
  validatePassword,
  isPasswordValid,
} from './password.utils';

describe('hashPassword', () => {
  it('produces different hashes for the same input (salt randomness)', async () => {
    const hash1 = await hashPassword('SamePassword1');
    const hash2 = await hashPassword('SamePassword1');

    expect(hash1).not.toBe(hash2);
  });

  it('produces a valid bcrypt hash (60 chars, $2b$ prefix)', async () => {
    const hash = await hashPassword('TestPassword1');

    expect(hash).toHaveLength(60);
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it('throws when given an empty string', async () => {
    await expect(hashPassword('')).rejects.toThrow('Password cannot be empty');
  });
});

describe('comparePassword', () => {
  it('returns true for the correct password', async () => {
    const hash = await hashPassword('CorrectPass99');
    const result = await comparePassword('CorrectPass99', hash);

    expect(result).toBe(true);
  });

  it('returns false for an incorrect password', async () => {
    const hash = await hashPassword('CorrectPass99');
    const result = await comparePassword('WrongPass99', hash);

    expect(result).toBe(false);
  });

  it('returns false when password is empty', async () => {
    const hash = await hashPassword('SomePassword1');
    const result = await comparePassword('', hash);

    expect(result).toBe(false);
  });

  it('returns false when hash is empty', async () => {
    const result = await comparePassword('SomePassword1', '');

    expect(result).toBe(false);
  });
});

describe('validatePassword', () => {
  it('returns invalid for passwords shorter than 8 characters', () => {
    const { isValid, error } = validatePassword('short');

    expect(isValid).toBe(false);
    expect(error).toMatch(/at least 8 characters/);
  });

  it('returns valid for passwords of 8 or more characters', () => {
    const { isValid } = validatePassword('LongEnough1');

    expect(isValid).toBe(true);
  });

  it('returns invalid for empty input', () => {
    const { isValid, error } = validatePassword('');

    expect(isValid).toBe(false);
    expect(error).toMatch(/required/i);
  });
});

describe('isPasswordValid', () => {
  it('returns true for passwords meeting the minimum length', () => {
    expect(isPasswordValid('ValidPass1')).toBe(true);
  });

  it('returns false for passwords below the minimum length', () => {
    expect(isPasswordValid('short')).toBe(false);
  });
});
