# API Service Documentation

## Overview

The `api.ts` service provides a configured Axios instance with automatic token management, request/response interceptors, and error handling for the EventSphere frontend application.

## Features

### 1. Automatic Token Attachment
- Automatically attaches `Authorization: Bearer <accessToken>` header to all requests
- Integrates with AuthContext for token management

### 2. Automatic Token Refresh
- Detects 401 errors with `TOKEN_EXPIRED` code
- Automatically refreshes access token using refresh token
- Retries the original request with new access token
- Prevents infinite retry loops with `_retry` flag

### 3. Error Handling
- Shows toast notifications for all errors (400+)
- Extracts error messages from API responses
- Provides fallback messages for network errors
- Logs user out on refresh token failure

### 4. CORS Configuration
- Configured for cross-origin requests
- Does not use cookies (per design)
- Base URL from environment variable

## Usage

### Basic Setup

The API service integrates with AuthContext automatically. No manual setup required.

```typescript
import api from '../services/api';

// Make authenticated requests
const response = await api.get('/api/users/profile');
const data = response.data;
```

### Available Methods

```typescript
// GET request
const response = await api.get('/api/endpoint');

// POST request
const response = await api.post('/api/endpoint', { data });

// PATCH request
const response = await api.patch('/api/endpoint/:id', { data });

// DELETE request
const response = await api.delete('/api/endpoint/:id');
```

### Token Manager Integration

The API service uses a token manager interface to access and update tokens. This is automatically set up by AuthContext:

```typescript
interface TokenManager {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearTokens: () => void;
}
```

## Request Flow

### Authenticated Request

```
1. User makes API call: api.get('/api/protected')
2. Request Interceptor runs:
   - Gets accessToken from TokenManager
   - Attaches Authorization: Bearer <accessToken> header
3. Request sent to backend
4. Response received:
   - Success (200-299): Return response
   - Error (400+): Go to Response Interceptor
```

### Token Expired Flow

```
1. Request returns 401 with code='TOKEN_EXPIRED'
2. Response Interceptor detects expired token
3. Calls /api/auth/refresh with refresh token
4. Two possible outcomes:
   a) Refresh succeeds:
      - Updates tokens via TokenManager
      - Retries original request with new token
      - Returns response to caller
   b) Refresh fails:
      - Clears tokens via TokenManager
      - Shows "Session expired" toast
      - Redirects to /login
      - Rejects promise
```

## Error Handling

### Error Response Format

All API errors follow this structure:

```typescript
{
  success: false,
  message: "Human-readable error message",
  code?: "ERROR_CODE",  // Optional error code
  errors?: []           // Optional validation errors
}
```

### HTTP Status Codes

- **400 Bad Request**: Validation errors, malformed input
- **401 Unauthorized**: Authentication required or token expired
- **403 Forbidden**: Authenticated but not authorized
- **404 Not Found**: Resource doesn't exist
- **409 Conflict**: Duplicate data, status conflicts
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server errors

### Toast Notifications

The API service automatically shows toast notifications for errors:

- **Error toast (red)**: All 400+ status codes
- Message extracted from `response.data.message`
- Fallback to `error.message` if no response message
- Final fallback: "An error occurred. Please try again."

## Configuration

### Environment Variables

```bash
# .env file
VITE_API_BASE_URL=http://localhost:5000
```

### Base Configuration

```typescript
{
  baseURL: VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: false  // Not using cookies
}
```

## Security Considerations

### Token Storage
- Tokens stored in memory (React state) only
- No localStorage or sessionStorage
- Tokens lost on page refresh (intentional per design)

### CSRF Protection
- Not using cookies, so no CSRF vulnerability
- Authorization header approach is CSRF-safe

### XSS Mitigation
- Tokens in memory only (not exposed via localStorage)
- Still vulnerable if XSS exists (sanitize user input!)
- Implement Content Security Policy in production

## Testing

### Unit Tests

See `api.test.ts` for unit tests covering:

- Token manager setup
- Base configuration
- Interceptor presence
- Token manager integration

### Integration Testing

For integration tests with the API service:

```typescript
import { render, waitFor } from '@testing-library/react';
import { AuthProvider } from '../contexts/AuthContext';
import api from '../services/api';

// Mock API responses
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Test component with API calls
test('fetches user data', async () => {
  (api.get as any).mockResolvedValue({
    data: { user: { name: 'Test User' } }
  });
  
  // Test your component
});
```

## Common Patterns

### Loading States

```typescript
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const fetchData = async () => {
  setIsLoading(true);
  setError(null);
  
  try {
    const response = await api.get('/api/data');
    // Handle success
  } catch (err: any) {
    setError(err.response?.data?.message || 'Failed to fetch data');
    // Toast already shown by interceptor
  } finally {
    setIsLoading(false);
  }
};
```

### Form Submissions

```typescript
const handleSubmit = async (formData: FormData) => {
  try {
    const response = await api.post('/api/endpoint', formData);
    
    // Show success toast
    toast.success('Saved successfully!');
    
    // Handle success (navigate, update state, etc.)
  } catch (error) {
    // Error toast already shown by interceptor
    // Additional error handling if needed
  }
};
```

### Canceling Requests

```typescript
import { useEffect, useState } from 'react';
import axios from 'axios';

const useFetchData = (url: string) => {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    const source = axios.CancelToken.source();
    
    api.get(url, { cancelToken: source.token })
      .then(response => setData(response.data))
      .catch(err => {
        if (!axios.isCancel(err)) {
          console.error(err);
        }
      });
    
    return () => {
      source.cancel('Component unmounted');
    };
  }, [url]);
  
  return data;
};
```

## Troubleshooting

### Issue: "Session expired" toast appears immediately

**Cause**: Refresh token is invalid or expired

**Solution**: User needs to log in again

### Issue: Infinite redirect loop

**Cause**: Protected route accessed without valid tokens

**Solution**: Check ProtectedRoute component and authentication flow

### Issue: CORS errors

**Cause**: Backend CORS configuration not matching frontend origin

**Solution**: 
1. Check `FRONTEND_URL` in backend `.env`
2. Verify CORS middleware configured correctly
3. Ensure `VITE_API_BASE_URL` points to correct backend

### Issue: 401 errors not triggering token refresh

**Cause**: Error response doesn't include `code: 'TOKEN_EXPIRED'`

**Solution**: Backend must return `code: 'TOKEN_EXPIRED'` in 401 responses

## Related Files

- `src/contexts/AuthContext.tsx` - Token management and authentication state
- `src/guards/ProtectedRoute.tsx` - Route-based authorization
- `src/services/auth.service.ts` - Authentication API calls (future)

## References

- [Axios Documentation](https://axios-http.com/docs/intro)
- [React Hot Toast](https://react-hot-toast.com/)
- Design Document: Phase 1b - Frontend Authentication
