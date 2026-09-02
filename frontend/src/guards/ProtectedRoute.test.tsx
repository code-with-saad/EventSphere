/**
 * ProtectedRoute.test.tsx
 *
 * Tests the three redirect behaviours of the ProtectedRoute guard.
 * Validates Requirements: 16.1 – 16.8
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

// Spy on Navigate so we can assert which `to` it was called with.
// All other react-router-dom exports (MemoryRouter, etc.) stay real.
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    Navigate: vi.fn((_props: { to: string; replace?: boolean }) => null),
  };
});

// Configurable auth mock — each test calls vi.mocked(useAuth).mockReturnValue(...)
vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}));

// Re-implement getHomeRoute inline — same logic as App.tsx
vi.mock('../App', () => ({
  getHomeRoute: (user: { role: string; status: string }) => {
    if (user.role === 'organizer' && user.status === 'pending') return '/dashboard/pending-approval';
    if (user.role === 'organizer' && user.status === 'rejected') return '/dashboard/rejected';
    const routes: Record<string, string> = {
      superadmin: '/dashboard/superadmin',
      organizer:  '/dashboard/organizer',
      exhibitor:  '/dashboard/exhibitor',
      attendee:   '/dashboard/attendee',
    };
    return routes[user.role.toLowerCase()] ?? '/dashboard';
  },
}));

// ── Imports after mocks ───────────────────────────────────────────────────────
import { MemoryRouter, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildUser(overrides: Partial<{
  id: string;
  email: string;
  fullName: string;
  role: 'superadmin' | 'organizer' | 'exhibitor' | 'attendee';
  status: 'pending' | 'active' | 'suspended';
  isEmailVerified: boolean;
}> = {}) {
  return {
    id: 'u1',
    email: 'user@example.com',
    fullName: 'Test User',
    role: 'attendee' as const,
    status: 'active' as const,
    isEmailVerified: true,
    ...overrides,
  };
}

function mockAuth(partial: {
  user?: ReturnType<typeof buildUser> | null;
  isAuthenticated?: boolean;
  isLoading?: boolean;
}) {
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    accessToken: null,
    refreshToken: null,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    refreshAccessToken: vi.fn(),
    checkAuthStatus: vi.fn(),
    ...partial,
  } as any);
}

function renderRoute(allowedRoles: string[], children: React.ReactNode = React.createElement('div', { 'data-testid': 'children' }, 'Protected Content')) {
  return render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(ProtectedRoute, { allowedRoles, children })
    )
  );
}

// Helper: assert Navigate was called with `to` prop equal to the given path
function expectNavigateTo(path: string) {
  const calls = vi.mocked(Navigate).mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  const firstCallProps = calls[0][0] as { to: string; replace?: boolean };
  expect(firstCallProps.to).toBe(path);
  expect(firstCallProps.replace).toBe(true);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 1. Loading spinner ─────────────────────────────────────────────────────

  it('1. shows a loading spinner when isLoading is true', () => {
    mockAuth({ isLoading: true, isAuthenticated: false, user: null });

    renderRoute(['attendee']);

    expect(screen.getByRole('status')).toBeInTheDocument();
    // Children must NOT be rendered while loading
    expect(screen.queryByTestId('children')).not.toBeInTheDocument();
  });

  // ── 2. Unauthenticated redirect ────────────────────────────────────────────

  it('2. redirects to /login when the user is not authenticated', () => {
    mockAuth({ isLoading: false, isAuthenticated: false, user: null });

    renderRoute(['attendee']);

    expectNavigateTo('/login');
  });

  // ── 3. Authorised — renders children ──────────────────────────────────────

  it('3. renders children when authenticated with the correct role', () => {
    const user = buildUser({ role: 'attendee', status: 'active' });
    mockAuth({ isLoading: false, isAuthenticated: true, user });

    renderRoute(['attendee']);

    expect(screen.getByTestId('children')).toBeInTheDocument();
    // Navigate should NOT have been called
    expect(vi.mocked(Navigate)).not.toHaveBeenCalled();
  });

  // ── 4. Wrong-role redirect ─────────────────────────────────────────────────

  it('4. redirects an exhibitor to /dashboard/exhibitor when the route requires superadmin', () => {
    const user = buildUser({ role: 'exhibitor', status: 'active' });
    mockAuth({ isLoading: false, isAuthenticated: true, user });

    renderRoute(['superadmin']);

    expectNavigateTo('/dashboard/exhibitor');
  });

  // ── 5. Pending organizer wrong-role redirect ───────────────────────────────
  // A pending organizer trying to access a superadmin route gets redirected to
  // /dashboard/pending-approval (getHomeRoute returns that for pending organizers).

  it('5. redirects a pending organizer to /dashboard/pending-approval when accessing a superadmin route', () => {
    const user = buildUser({ role: 'organizer', status: 'pending' });
    mockAuth({ isLoading: false, isAuthenticated: true, user });

    // allowedRoles does NOT include organizer → isAuthorised is false
    // → getHomeRoute is called → returns /dashboard/pending-approval
    renderRoute(['superadmin']);

    expectNavigateTo('/dashboard/pending-approval');
  });
});
