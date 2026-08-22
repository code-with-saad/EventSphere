# EventSphere Context Providers

This directory contains React Context providers for managing global application state.

## Available Contexts

### 1. AuthContext

Manages authentication state and provides methods for user authentication operations.

**Features:**
- Token storage in memory (not localStorage/sessionStorage for security)
- Automatic token refresh every 14 minutes (before 15-minute expiry)
- Login, logout, and registration operations
- User state management

**Usage:**

```tsx
import { useAuth } from '../contexts';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  const handleLogin = async () => {
    try {
      const response = await login('user@example.com', 'password123');
      console.log('Login successful:', response);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div>
      {isAuthenticated ? (
        <>
          <p>Welcome, {user?.fullName}!</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
}
```

**Available Methods:**

- `login(email: string, password: string)`: Authenticate user and store tokens
- `logout()`: Clear authentication state and invalidate tokens
- `register(data: RegisterData)`: Register a new user account
- `refreshAccessToken()`: Manually refresh the access token
- `checkAuthStatus()`: Check if user is authenticated

**Available State:**

- `user`: Current user object (null if not authenticated)
- `accessToken`: Current access token (null if not authenticated)
- `refreshToken`: Current refresh token (null if not authenticated)
- `isAuthenticated`: Boolean indicating authentication status
- `isLoading`: Boolean indicating if auth state is being initialized

**Token Management:**

Tokens are stored in React state (memory only) for security:
- Access tokens expire in 15 minutes
- Refresh tokens expire in 7 days
- Automatic refresh occurs every 14 minutes
- Tokens are lost on page refresh (by design)

### 2. ThemeContext

Manages application theme (dark/light mode) with persistence.

**Features:**
- Theme persistence using localStorage
- Automatic detection of system preference on first load
- Applies theme class to document root element

**Usage:**

```tsx
import { useTheme } from '../contexts';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme}>
      Current theme: {theme}
      {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}
```

**Available Methods:**

- `toggleTheme()`: Switch between dark and light mode

**Available State:**

- `theme`: Current theme ('dark' | 'light')

**Theme Application:**

The theme is applied by adding a class to the document root element:
- Dark mode: `<html class="dark">`
- Light mode: `<html class="light">`

Your CSS/Tailwind should use these classes to style components accordingly.

## Provider Setup

Both providers are already integrated in `App.tsx`:

```tsx
import { AuthProvider, ThemeProvider } from './contexts';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        {/* Your app components */}
      </AuthProvider>
    </ThemeProvider>
  );
}
```

**Provider Order:**
- ThemeProvider is outermost (no dependencies)
- AuthProvider is inside ThemeProvider

## Testing

Visit `/context-test` route to see both contexts in action and verify they're working correctly.

## Security Considerations

### Token Storage
- Tokens are stored in React state (memory only)
- No localStorage/sessionStorage usage (prevents XSS attacks from persisting tokens)
- Tokens are cleared on page refresh (users must log in again)
- This is intentional per the security design

### Token Refresh
- Access tokens are automatically refreshed before expiry
- If refresh fails, user is automatically logged out
- Refresh tokens are rotated on each refresh (old token invalidated)

## Environment Variables

The AuthContext uses the following environment variable:

- `VITE_API_BASE_URL`: Backend API base URL (default: http://localhost:5000)

Ensure this is set in your `.env` file.

## Implementation Details

### AuthContext Implementation

**State Management:**
```typescript
const [user, setUser] = useState<User | null>(null);
const [accessToken, setAccessToken] = useState<string | null>(null);
const [refreshToken, setRefreshToken] = useState<string | null>(null);
const [isLoading, setIsLoading] = useState<boolean>(true);
```

**Automatic Refresh:**
```typescript
useEffect(() => {
  if (!accessToken || !refreshToken) return;
  
  const refreshInterval = setInterval(() => {
    refreshAccessToken().catch(console.error);
  }, 14 * 60 * 1000); // 14 minutes
  
  return () => clearInterval(refreshInterval);
}, [accessToken, refreshToken]);
```

### ThemeContext Implementation

**Theme Initialization:**
```typescript
const [theme, setTheme] = useState<Theme>(() => {
  // Check localStorage first
  const storedTheme = localStorage.getItem('theme');
  if (storedTheme === 'dark' || storedTheme === 'light') {
    return storedTheme;
  }
  
  // Fall back to system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches 
    ? 'dark' 
    : 'light';
});
```

**Theme Application:**
```typescript
useEffect(() => {
  document.documentElement.classList.remove('dark', 'light');
  document.documentElement.classList.add(theme);
  localStorage.setItem('theme', theme);
}, [theme]);
```

## Error Handling

Both contexts throw errors if used outside their providers:

```typescript
if (context === undefined) {
  throw new Error('useAuth must be used within an AuthProvider');
}
```

Always ensure your components are wrapped with the appropriate providers.

## Next Steps

After implementing the contexts, the next phase will add:
1. API service with Axios interceptors (task 19)
2. Toast notification system integration (task 20)
3. Authentication pages (login, register, OTP verification) (task 21-22)
4. Protected routes and route guards (task 23-24)

## Related Files

- `AuthContext.tsx`: Authentication context implementation
- `ThemeContext.tsx`: Theme context implementation
- `index.ts`: Barrel export for easy imports
- `../components/TestContexts.tsx`: Test component for verifying contexts
