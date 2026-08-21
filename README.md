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

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:5000
```

### Backend (.env)
```
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_min_32_chars
RESEND_API_KEY=your_resend_api_key
SUPERADMIN_EMAIL=admin@eventsphere.com
SUPERADMIN_PASSWORD=your_secure_password
FRONTEND_URL=http://localhost:5173
```

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
