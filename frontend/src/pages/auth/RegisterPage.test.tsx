/**
 * RegisterPage.test.tsx
 *
 * Tests form validation logic for RegisterPage.
 * Validates Requirements: 5.1, 5.2, 5.3
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
// vi.mock factories are hoisted — cannot close over variables declared outside.

const mockNavigate = vi.fn();
const mockRegister = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  BrowserRouter: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  MemoryRouter: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  Navigate: vi.fn(() => null),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    register: mockRegister,
    login: vi.fn(),
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
    logout: vi.fn(),
    refreshAccessToken: vi.fn(),
    checkAuthStatus: vi.fn(),
  }),
}));

vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}));

// BentoCard uses useTheme internally — the ThemeContext mock above covers it.
// react-hot-toast: factory must not use JSX
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../../utils/toast', () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
}));

// ── Import under test ─────────────────────────────────────────────────────────
import { RegisterPage } from './RegisterPage';

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPage() {
  return render(React.createElement(RegisterPage));
}

/** Returns the email input by its label id */
function emailInput() {
  return document.getElementById('email') as HTMLInputElement;
}

/** Returns the password input by its element id (avoids ambiguity with the toggle button) */
function passwordInput() {
  return document.getElementById('password') as HTMLInputElement;
}

function fullNameInput() {
  return document.getElementById('fullName') as HTMLInputElement;
}

function roleSelect() {
  return document.getElementById('role') as HTMLSelectElement;
}

/** Fill every field. Pass '' to leave a field empty. */
function fillForm(opts: {
  email?: string;
  password?: string;
  fullName?: string;
  role?: string;
} = {}) {
  const {
    email = 'user@example.com',
    password = 'Password1',
    fullName = 'John Doe',
    role = 'attendee',
  } = opts;

  fireEvent.change(emailInput(), { target: { value: email } });
  fireEvent.change(passwordInput(), { target: { value: password } });
  fireEvent.change(fullNameInput(), { target: { value: fullName } });
  fireEvent.change(roleSelect(), { target: { value: role } });
}

function submitForm() {
  fireEvent.submit(document.querySelector('form')!);
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('RegisterPage — form validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: register never resolves (simulates pending state when needed)
    mockRegister.mockReturnValue(new Promise(() => {}));
  });

  // ── Email validation ───────────────────────────────────────────────────────

  describe('Email validation', () => {
    it('1. shows "Email is required" when email is empty on submit', async () => {
      renderPage();
      fillForm({ email: '' });
      submitForm();

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
      });
    });

    it('2. shows "Invalid email format" for a malformed email', async () => {
      renderPage();
      fillForm({ email: 'notanemail' });
      submitForm();

      await waitFor(() => {
        expect(screen.getByText('Invalid email format')).toBeInTheDocument();
      });
    });

    it('3. clears the email error once the user starts correcting the field', async () => {
      renderPage();
      // Trigger error first
      fillForm({ email: '' });
      submitForm();

      await waitFor(() => expect(screen.getByText('Email is required')).toBeInTheDocument());

      // Typing any value clears the error immediately via onChange
      act(() => {
        fireEvent.change(emailInput(), { target: { value: 'valid@example.com' } });
      });

      await waitFor(() => {
        expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
      });
    });
  });

  // ── Password validation ────────────────────────────────────────────────────

  describe('Password validation', () => {
    it('4. shows "Password is required" when password is empty on submit', async () => {
      renderPage();
      fillForm({ password: '' });
      submitForm();

      await waitFor(() => {
        expect(screen.getByText('Password is required')).toBeInTheDocument();
      });
    });

    it('5. shows "Password must be at least 8 characters" for a 7-character password', async () => {
      renderPage();
      fillForm({ password: 'Pass123' }); // exactly 7 chars
      submitForm();

      await waitFor(() => {
        expect(
          screen.getByText('Password must be at least 8 characters')
        ).toBeInTheDocument();
      });
    });

    it('6. does NOT show a password error for an 8-character password', async () => {
      renderPage();
      fillForm({ password: 'Pass1234' }); // exactly 8 chars
      submitForm();

      await waitFor(() => {
        expect(
          screen.queryByText('Password must be at least 8 characters')
        ).not.toBeInTheDocument();
        expect(screen.queryByText('Password is required')).not.toBeInTheDocument();
      });
    });
  });

  // ── Form submission guard ──────────────────────────────────────────────────

  describe('Form submission', () => {
    it('7. does NOT call register when validation fails', async () => {
      renderPage();
      // Submit with all fields empty — all validators fire
      submitForm();

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
      });

      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('8. disables the submit button while the form is in a loading state', async () => {
      // register returns a promise that never resolves → isLoading stays true
      mockRegister.mockReturnValue(new Promise<never>(() => {}));

      renderPage();

      // Fill all fields with valid data
      fillForm();

      // Submit — triggers the pending register call, isLoading flips to true
      act(() => { submitForm(); });

      // Once loading starts, the button text changes to "Creating account..." and is disabled
      await waitFor(() => {
        const btn = screen.getByRole('button', { name: /creating account/i });
        expect(btn).toBeDisabled();
      });
    });
  });
});
