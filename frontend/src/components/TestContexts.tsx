import { useAuth, useTheme } from '../contexts';

export function TestContexts() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Context Test Page</h1>
      
      <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc' }}>
        <h2>Theme Context</h2>
        <p>Current theme: <strong>{theme}</strong></p>
        <button onClick={toggleTheme}>Toggle Theme</button>
        <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
          Check the document root element - it should have the theme class applied.
        </p>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc' }}>
        <h2>Auth Context</h2>
        <p>Is Loading: <strong>{isLoading ? 'Yes' : 'No'}</strong></p>
        <p>Is Authenticated: <strong>{isAuthenticated ? 'Yes' : 'No'}</strong></p>
        <p>User: <strong>{user ? JSON.stringify(user, null, 2) : 'null'}</strong></p>
        <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
          Note: User will be null until login is implemented and called.
        </p>
      </div>
    </div>
  );
}
