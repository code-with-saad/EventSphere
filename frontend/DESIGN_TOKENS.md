# EventSphere Design Tokens

This document describes the design tokens configured for EventSphere Phase 0 & Phase 1.

## Overview

EventSphere uses **Tailwind CSS v4** with custom design tokens defined via the `@theme` directive in `src/index.css`. The design system features a distinctive "Midnight Indigo + Cyan" theme with glass morphism effects and bento-style card layouts, supporting both dark and light modes.

## Configuration Method

**Tailwind v4 Note:** Unlike Tailwind v3, version 4 uses CSS-based configuration via the `@theme` directive instead of JavaScript configuration files. All custom tokens are defined in `src/index.css`.

## Color Tokens

### Base Colors
- **Base Dark**: `#0B0F1A` (deep navy/indigo) - Dark mode background
- **Base Light**: `#f8fafc` - Light mode background

### Bento Card Colors
Bento cards are content containers with semi-transparent backgrounds and defined borders.

- **Dark Mode:**
  - Background: `rgba(20, 27, 55, 0.85)` (elevated indigo)
  - Border: `#1e2a4a` (subtle indigo border)
  
- **Light Mode:**
  - Background: `rgba(255, 255, 255, 0.9)`
  - Border: `#e2e8f0`

**Border Radius**: `1rem` (16px) - rounded-xl

### Glass Component Colors
Glass components use backdrop blur for a frosted glass effect (used for sidebar and sticky header).

- **Dark Mode Background**: `rgba(20, 27, 55, 0.5)` (subtle indigo glass)
- **Light Mode Background**: `rgba(255, 255, 255, 0.6)`
- **Backdrop Blur**: `12px`

### Accent Colors

#### Cyan (Success/Active states)
- **Primary**: `#22D3EE` (Cyan-400)
- **Light**: `#cffafe` (Cyan-100)

#### Violet (Info/Pending states)
- **Primary**: `#a78bfa` (Violet-400)
- **Light**: `#ede9fe` (Violet-100)

## Usage Examples

### Bento Card Component

```tsx
<div 
  className="p-6 border hover:shadow-lg transition-shadow duration-200"
  style={{
    backgroundColor: 'rgba(20, 27, 55, 0.85)',
    borderColor: '#1e2a4a',
    borderRadius: '1rem',
  }}
>
  <h3 className="text-xl font-semibold mb-2">Card Title</h3>
  <p className="text-gray-400">Card content goes here</p>
</div>
```

### Glass Component (Sidebar)

```tsx
<aside 
  className="fixed left-0 top-0 h-full w-64 p-6 border-r"
  style={{
    backgroundColor: 'rgba(20, 27, 55, 0.5)',
    backdropFilter: 'blur(12px)',
    borderColor: 'rgba(100, 116, 139, 0.5)',
  }}
>
  {/* Sidebar content */}
</aside>
```

### Status Badges

```tsx
{/* Success badge */}
<span 
  className="px-4 py-2 text-white rounded-lg font-medium"
  style={{ backgroundColor: '#22D3EE' }}
>
  ✓ Active
</span>

{/* Info badge */}
<span 
  className="px-4 py-2 text-white rounded-lg font-medium"
  style={{ backgroundColor: '#a78bfa' }}
>
  ⏳ Pending
</span>
```

## Dark/Light Mode Toggle

The application uses class-based dark mode toggling:

```typescript
// Enable dark mode (default)
document.documentElement.classList.add('dark');

// Enable light mode
document.documentElement.classList.remove('dark');
document.documentElement.classList.add('light');
```

The `<html>` element in `index.html` has `class="dark"` by default.

## Testing

Visit `/design-test` route to see all design tokens in action:
- Bento card variations
- Glass effect demonstrations
- Accent color badges
- Dark/light mode toggle
- Color palette reference

## Requirements Validation

This configuration satisfies the following requirements:

- ✅ **Requirement 3.1**: Design tokens defined in Tailwind configuration (via CSS @theme)
- ✅ **Requirement 3.2**: Base background color (#0B0F1A - deep navy/indigo) included
- ✅ **Requirement 3.3**: Bento card tokens (rgba(20, 27, 55, 0.85), #1e2a4a, rounded-xl) configured
- ✅ **Requirement 3.4**: Glass component tokens (rgba(20, 27, 55, 0.5), backdrop-blur-md) configured
- ✅ **Requirement 3.5**: Accent colors (Cyan and Violet) for status badges included
- ✅ **Requirement 3.6**: Dark mode enabled via `class` strategy
- ✅ **Requirement 3.7**: Theme preference can be persisted (via localStorage in ThemeContext)

## Dependencies

- `tailwindcss@4.3.3` - Core Tailwind CSS framework
- `@tailwindcss/postcss@4.3.3` - PostCSS plugin for Tailwind v4
- `postcss` - CSS processor
- `autoprefixer` - Vendor prefix automation

## File Structure

```
frontend/
├── src/
│   ├── index.css              # Tailwind imports + @theme tokens
│   └── components/
│       └── TestDesignTokens.tsx  # Design token demo page
├── postcss.config.js          # PostCSS configuration
└── DESIGN_TOKENS.md           # This file
```

## Future Enhancements

- Add animation utilities for fade-in, slide-in effects
- Consider adding more semantic color tokens for error/warning states
- Expand theme support beyond dark/light (e.g., high contrast mode)
- Create reusable component library based on these tokens
