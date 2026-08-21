# EventSphere - Event & Expo Management SaaS

EventSphere is a comprehensive multi-role Event & Expo Management SaaS platform designed to streamline event creation, exhibitor management, and attendee engagement.

## Project Overview

EventSphere supports four distinct user roles:
- **SuperAdmin**: System-wide administrative privileges, manages organizer approvals
- **Organizer**: Creates and manages events and expos
- **Exhibitor**: Participates in events with dedicated booths/spaces
- **Attendee**: Registers and attends events

## Project Structure (Monorepo)

```
EventSphere/
├── frontend/          # React + Vite + TypeScript client application
├── backend/           # Node.js + Express + TypeScript API server
├── .gitignore         # Git ignore rules
├── README.md          # This file
└── PROGRESS.md        # Implementation progress tracking
```

## Tech Stack

### Frontend
- **Framework**: React 18.x
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3.x
- **Routing**: React Router 6.x
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast

### Backend
- **Runtime**: Node.js 18.x+
- **Framework**: Express 4.x
- **Language**: TypeScript
- **Database**: MongoDB Atlas (free tier)
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **Email Service**: Resend

### Database
- **MongoDB Atlas**: Cloud-hosted MongoDB instance (free tier M0)
- **Collections**: users, otps, refresh_tokens

## Setup Instructions

### Prerequisites
- Node.js 18.x or higher
- npm or yarn
- MongoDB Atlas account (free tier)
- Resend API key (for email functionality)

### Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Update environment variables in `.env`

5. Start development server:
   ```bash
   npm run dev
   ```

Frontend will be available at: `http://localhost:5173`

### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Update environment variables in `.env` with your MongoDB URI, JWT secret, and Resend API key

5. Seed the SuperAdmin account:
   ```bash
   npm run seed:superadmin
   ```

6. Start development server:
   ```bash
   npm run dev
   ```

Backend will be available at: `http://localhost:5000`

## Environment Variables

Both frontend and backend require environment configuration. Use the provided `.env.example` files as templates.

### Frontend Environment Variables

Create `frontend/.env` from `frontend/.env.example`:

```bash
cd frontend
cp .env.example .env
```

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:5000` | Yes |

**Development Setup:**
```env
VITE_API_BASE_URL=http://localhost:5000
```

**Production Setup:**
```env
VITE_API_BASE_URL=https://api.yourdomain.com
```

### Backend Environment Variables

Create `backend/.env` from `backend/.env.example`:

```bash
cd backend
cp .env.example .env
```

| Variable | Description | Example | Required | Validation |
|----------|-------------|---------|----------|------------|
| `PORT` | Server port number | `5000` | Yes | Must be a valid port number |
| `NODE_ENV` | Application environment | `development`, `production`, `test` | Yes | Must be one of: development, production, test |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/eventsphere` | Yes | Must be a valid MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT signing | `your-super-secret-jwt-key-minimum-32-characters-long` | Yes | Minimum 32 characters |
| `RESEND_API_KEY` | Resend email service API key | `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx` | Yes | Must be a valid Resend API key |
| `SUPERADMIN_EMAIL` | SuperAdmin account email | `admin@eventsphere.com` | Yes | Must be a valid email address |
| `SUPERADMIN_PASSWORD` | SuperAdmin account password | `SecureAdminPassword123` | Yes | Minimum 8 characters |
| `FRONTEND_URL` | Frontend application URL for CORS | `http://localhost:5173` | Yes | Must be a valid URL |

**Development Setup:**
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/eventsphere?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPERADMIN_EMAIL=admin@eventsphere.com
SUPERADMIN_PASSWORD=SecureAdminPassword123
FRONTEND_URL=http://localhost:5173
```

**Production Setup:**
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://prod_user:prod_pass@prod-cluster.mongodb.net/eventsphere?retryWrites=true&w=majority
JWT_SECRET=use-a-cryptographically-secure-random-string-at-least-32-chars
RESEND_API_KEY=re_your_production_resend_api_key
SUPERADMIN_EMAIL=admin@yourdomain.com
SUPERADMIN_PASSWORD=UseAVerySecurePasswordHere
FRONTEND_URL=https://yourdomain.com
```

### Environment Variable Validation

The backend uses **Zod** for runtime environment variable validation. When the server starts:

1. All environment variables are validated against the schema in `backend/src/config/env.ts`
2. If validation fails, the server will **not start** and will display detailed error messages
3. This prevents runtime errors from missing or misconfigured environment variables

**Example validation error:**
```
❌ Environment variable validation failed:
  - JWT_SECRET: JWT_SECRET must be at least 32 characters long
  - SUPERADMIN_EMAIL: SUPERADMIN_EMAIL must be a valid email address
```

### Getting Required Credentials

#### MongoDB Atlas
1. Sign up for a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (M0 Sandbox - Free)
3. Create a database user with read/write permissions
4. Add your IP address to the IP Access List (or use `0.0.0.0/0` for development)
5. Get your connection string from the "Connect" button
6. Replace `<password>` with your database user password

#### Resend API Key
1. Sign up for a free account at [Resend](https://resend.com)
2. Navigate to API Keys in the dashboard
3. Create a new API key
4. Copy the API key (starts with `re_`)

#### JWT Secret
Generate a secure random string (minimum 32 characters):

**Using Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Using OpenSSL:**
```bash
openssl rand -hex 32
```

### Security Best Practices

⚠️ **IMPORTANT SECURITY NOTES:**

1. **Never commit `.env` files** to version control (already in `.gitignore`)
2. **Use different credentials** for development and production
3. **Rotate secrets regularly**, especially after team member changes
4. **Use strong passwords** for SuperAdmin (minimum 12 characters recommended)
5. **Restrict MongoDB IP access** in production (don't use `0.0.0.0/0`)
6. **Keep API keys confidential** and never share them publicly
7. **Use environment-specific values** (different JWT secrets per environment)

## Key Features (Phase 0 & Phase 1)

### Phase 0: Project Foundation
- ✅ Monorepo structure with frontend and backend
- ✅ MongoDB Atlas connection
- ✅ Tailwind CSS design system
- ✅ Environment configuration

### Phase 1: Authentication & Authorization
- User registration for all roles (SuperAdmin, Organizer, Exhibitor, Attendee)
- Email OTP verification for Exhibitor and Attendee roles
- JWT-based authentication with access and refresh tokens
- SuperAdmin approval workflow for Organizers
- Forgot password flow (3-step: request OTP → verify OTP → reset password)
- Role-based route guards (frontend and backend)
- Dashboard shells for all four roles
- Toast notification system
- Responsive mobile layout
- Dark/Light theme support

## Authentication Strategy

- **Access Tokens**: 15-minute expiry, stored in memory (React state)
- **Refresh Tokens**: 7-day expiry, stored in memory with rotation on refresh
- **Token Storage**: In-memory only (no localStorage/cookies) for security
- **Auto-Refresh**: Tokens automatically refresh 1 minute before expiry

## Design System

- **Base Background**: Slate-950 (dark mode), Slate-50 (light mode)
- **Bento Cards**: Slate-900/80 background, Slate-800 border, rounded-xl
- **Glass Components**: Slate-900/40 background, backdrop-blur-md (sidebar, header only)
- **Accent Colors**: Emerald (success), Indigo (info)
- **Responsive Breakpoints**: 320px (mobile) → 768px (tablet) → 1024px+ (desktop)

## Development

### Running Tests

Frontend:
```bash
cd frontend
npm test
```

Backend:
```bash
cd backend
npm test
```

### Building for Production

Frontend:
```bash
cd frontend
npm run build
```

Backend:
```bash
cd backend
npm run build
```

## Project Status

See [PROGRESS.md](./PROGRESS.md) for detailed implementation progress and completed features.

## License

Proprietary - All rights reserved

## Support

For issues or questions, please contact the development team.
