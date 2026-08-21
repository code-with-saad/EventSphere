# EventSphere Frontend

React + TypeScript + Vite frontend application for EventSphere.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Start development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Technologies

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **React Hot Toast** - Toast notifications

## API Proxy

The Vite dev server is configured to proxy API requests to the backend:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`
- API calls to `/api/*` are automatically proxied to the backend

## Project Structure

```
frontend/
├── src/
│   ├── App.tsx           # Main app component with routing
│   ├── main.tsx          # Application entry point
│   ├── index.css         # Global styles
│   └── vite-env.d.ts     # Vite type declarations
├── index.html            # HTML template
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies and scripts
```
