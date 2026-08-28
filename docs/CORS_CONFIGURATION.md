# CORS Configuration

## Overview

Cross-Origin Resource Sharing (CORS) has been configured in the EventSphere backend to allow the frontend application to make requests from a different origin.

**Requirements Implemented:** 23.1, 23.2, 23.3, 23.4, 23.5, 23.6

## Configuration Details

The CORS middleware is configured in `src/server.ts` with the following options:

```typescript
const corsOptions = {
  origin: env.FRONTEND_URL,              // Allow requests from frontend origin
  credentials: true,                     // Allow credentials (cookies, auth headers)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200             // Legacy browser support
};
```

### Configuration Parameters

| Parameter | Value | Requirement | Description |
|-----------|-------|-------------|-------------|
| `origin` | `FRONTEND_URL` env variable | 23.1, 23.5 | Specifies the allowed origin for CORS requests |
| `credentials` | `true` | 23.2 | Allows cookies and authorization headers to be sent |
| `methods` | GET, POST, PUT, PATCH, DELETE, OPTIONS | - | Allowed HTTP methods |
| `allowedHeaders` | Content-Type, Authorization | 23.3, 23.4 | Allowed request headers |

### Security Features

- **Origin Restriction (Req 23.6):** Only requests from the configured `FRONTEND_URL` are allowed
- **No Wildcard Origin:** The configuration uses a specific origin, not `*`
- **Credentials Support:** Enables secure authentication with cookies and JWT tokens

## Environment Configuration

The allowed origin is sourced from the `FRONTEND_URL` environment variable:

```env
# In .env file
FRONTEND_URL=http://localhost:5173
```

For production, update this to your production frontend URL:

```env
FRONTEND_URL=https://yourdomain.com
```

## Testing

### Automated Tests

Run the CORS test suite:

```bash
npm test -- src/server.test.ts --run
```

The test suite validates:
- ✓ Requests from allowed origin are accepted (Req 23.1)
- ✓ Credentials are allowed (Req 23.2)
- ✓ Content-Type header is allowed (Req 23.4)
- ✓ Authorization header is allowed (Req 23.3)
- ✓ All specified HTTP methods are allowed
- ✓ Only the configured origin is permitted (Req 23.6)

### Manual Testing

#### Using PowerShell Script

Run the provided test script:

```powershell
# Ensure the server is running first
npm run dev

# In another terminal
.\test-cors.ps1
```

#### Using curl

```bash
# Test preflight request
curl -X OPTIONS http://localhost:5000/health \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v

# Test actual request
curl -X GET http://localhost:5000/health \
  -H "Origin: http://localhost:5173" \
  -v
```

#### From Frontend Application

Create a simple test in your frontend:

```javascript
// Test CORS from frontend (in browser console or component)
fetch('http://localhost:5000/health', {
  method: 'GET',
  credentials: 'include',  // Important: include credentials
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token-here'
  }
})
  .then(response => response.json())
  .then(data => console.log('CORS working:', data))
  .catch(error => console.error('CORS error:', error));
```

## Troubleshooting

### Common Issues

1. **CORS error in browser console**
   - Verify `FRONTEND_URL` matches your frontend's actual origin
   - Check that the server is running
   - Ensure credentials: 'include' is set in fetch requests

2. **"Access-Control-Allow-Origin" header missing**
   - Verify CORS middleware is applied before routes
   - Check that the Origin header matches `FRONTEND_URL`

3. **Credentials not being sent**
   - Ensure `credentials: 'include'` is set in fetch/axios requests
   - Verify `credentials: true` in CORS configuration

### Verification Checklist

- [ ] `FRONTEND_URL` environment variable is set correctly
- [ ] CORS middleware is applied before routes in `server.ts`
- [ ] Frontend requests include `credentials: 'include'`
- [ ] Frontend origin matches `FRONTEND_URL` exactly (including protocol and port)

## Implementation Status

| Requirement | Status | Details |
|-------------|--------|---------|
| 23.1 | ✅ | Backend accepts requests from frontend origin |
| 23.2 | ✅ | Credentials are allowed in requests |
| 23.3 | ✅ | Authorization header is allowed |
| 23.4 | ✅ | Content-Type header is allowed |
| 23.5 | ✅ | Origin sourced from FRONTEND_URL env variable |
| 23.6 | ✅ | Requests from other origins are rejected |

## Production Considerations

1. **Update FRONTEND_URL for production:**
   ```env
   FRONTEND_URL=https://your-production-domain.com
   ```

2. **Multiple Frontend Origins:**
   If you need to support multiple frontend origins (e.g., multiple subdomains), modify the CORS configuration:
   
   ```typescript
   const allowedOrigins = [
     process.env.FRONTEND_URL,
     process.env.ADMIN_FRONTEND_URL
   ].filter(Boolean);
   
   const corsOptions = {
     origin: (origin, callback) => {
       if (!origin || allowedOrigins.includes(origin)) {
         callback(null, true);
       } else {
         callback(new Error('Not allowed by CORS'));
       }
     },
     credentials: true,
     // ... rest of config
   };
   ```

3. **HTTPS in Production:**
   Ensure both frontend and backend use HTTPS in production for secure credential handling.
