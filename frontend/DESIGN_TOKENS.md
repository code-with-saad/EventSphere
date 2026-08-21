# EventSphere Design Tokens

This document describes the design tokens configured for EventSphere Phase 0 & Phase 1.

## Overview

EventSphere uses **Tailwind CSS v4** with custom design tokens defined via the `@theme` directive in `src/index.css`. The design system features a distinctive **Warm Stone Theme** with glass morphism effects and bento-style card layouts, supporting both dark and light modes.

The warm stone palette creates an earthy, sophisticated aesthetic using charcoal and stone tones accented with amber and orange highlights.

## Configuration Method

**Tailwind v4 Note:** Unlike Tailwind v3, version 4 uses CSS-based configuration via the `@theme` directive instead of JavaScript configuration files. All custom tokens are defined in `src/index.css`.

## Color Tokens

### Base Colors
- **Base Dark**: `#1C1917` (stone-900 - warm charcoal) - Dark mode background
- **Base Light**: `#FAFAF9` (stone-50 - warm white) - Light mode background

### Bento Card Colors
Bento cards are content containers with semi-transparent backgrounds and defined borders.

- **Dark Mode:**
  - Background: `#292524` (stone-800 - elevated warm charcoal)
  - Border: `#44403C` (stone-700 - subtle warm border)
  
- **Light Mode:**
  - Background: `rgba(250, 250, 249, 0.9)` (stone-50 with transparency)
  - Border: `#E7E5E4` (stone-200 - soft warm border)

**Border Radius**: `1rem` (16px) - rounded-xl

### Glass Component Colors
Glass components use backdrop blur for a frosted glass effect (used for sidebar and sticky header).

- **Dark Mode:**
  - Background: `rgba(41, 37, 36, 0.5)` (stone-800 semi-transparent)
  - Border: `rgba(68, 64, 60, 0.5)` (stone-700 semi-transparent)

- **Light Mode:**
  - Background: `rgba(245, 245, 244, 0.7)` (stone-100 semi-transparent)
  - Border: `rgba(231, 229, 228, 0.8)` (stone-200 semi-transparent)

- **Backdrop Blur**: `12px`

### Accent Colors (CTAs & Highlights)

Used for call-to-action buttons, highlighted links, and interactive elements that need to stand out.

#### Amber (Primary CTAs)
- **Primary**: `#F59E0B` (Amber-500)
- **Light**: `#FEF3C7` (Amber-100)

#### Orange (Secondary CTAs)
- **Primary**: `#EA580C` (Orange-600)
- **Light**: `#FFEDD5` (Orange-100)

### Status Colors (Semantic)

Used for state indicators, status badges, and feedback messages.

#### Success (Green)
- **Primary**: `#22C55E` (Green-500)
- **Light**: `#DCFCE7` (Green-100)

#### Warning (Amber)
- **Primary**: `#F59E0B` (Amber-500)
- **Light**: `#FEF3C7` (Amber-100)

#### Error (Red)
- **Primary**: `#EF4444` (Red-500)
- **Light**: `#FEE2E2` (Red-100)

## Usage Examples

### Bento Card Component

```tsx
<div 
  className="p-6 border hover:shadow-lg transition-shadow duration-200"
  style={{
    backgroundColor: '#292524',
    borderColor: '#44403C',
    borderRadius: '1rem',
  }}
>
  <h3 className="text-xl font-semibold mb-2">Card Title</h3>
  <p className="text-stone-400">Card content goes here</p>
</div>
```

### Glass Component (Sidebar)

```tsx
<aside 
  className="fixed left-0 top-0 h-full w-64 p-6 border-r"
  style={{
    backgroundColor: 'rgba(41, 37, 36, 0.5)',
    backdropFilter: 'blur(12px)',
    borderColor: 'rgba(68, 64, 60, 0.5)',
  }}
>
  {/* Sidebar content */}
</aside>
```

### Accent Colors - CTA Buttons

```tsx
{/* Primary CTA */}
<button 
  className="px-6 py-3 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
  style={{ backgroundColor: '#F59E0B' }}
>
  Primary Action
</button>

{/* Secondary CTA */}
<button 
  className="px-6 py-3 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
  style={{ backgroundColor: '#EA580C' }}
>
  Secondary Action
</button>

{/* Accent Link */}
<a 
  className="px-4 py-2 rounded-lg font-medium"
  style={{ color: '#F59E0B' }}
>
  Learn More →
</a>
```

### Status Badges

```tsx
{/* Success badge */}
<span 
  className="px-4 py-2 text-white rounded-lg font-medium"
  style={{ backgroundColor: '#22C55E' }}
>
  ✓ Active
</span>

{/* Warning badge */}
<span 
  className="px-4 py-2 text-white rounded-lg font-medium"
  style={{ backgroundColor: '#F59E0B' }}
>
  ⏳ Pending
</span>

{/* Error badge */}
<span 
  className="px-4 py-2 text-white rounded-lg font-medium"
  style={{ backgroundColor: '#EF4444' }}
>
  ✖ Error
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

## Color System Summary

| Purpose | Dark Mode | Light Mode | Usage |
|---------|-----------|------------|-------|
| Base Background | `#1C1917` (stone-900) | `#FAFAF9` (stone-50) | Page background |
| Bento Cards | `#292524` (stone-800) | `rgba(250, 250, 249, 0.9)` | Content containers |
| Glass Components | `rgba(41, 37, 36, 0.5)` | `rgba(245, 245, 244, 0.7)` | Sidebar, sticky headers |
| Primary CTA | `#F59E0B` (amber-500) | `#F59E0B` (amber-500) | Primary buttons, highlights |
| Secondary CTA | `#EA580C` (orange-600) | `#EA580C` (orange-600) | Secondary buttons |
| Success State | `#22C55E` (green-500) | `#22C55E` (green-500) | Success messages, active status |
| Warning State | `#F59E0B` (amber-500) | `#F59E0B` (amber-500) | Warnings, pending status |
| Error State | `#EF4444` (red-500) | `#EF4444` (red-500) | Errors, critical alerts |

## Testing

Visit `/design-test` route to see all design tokens in action:
- Bento card variations with warm stone theme
- Glass effect demonstrations with backdrop blur
- Accent color CTA buttons and links
- Semantic status color badges
- Dark/light mode toggle
- Complete color palette reference

## Requirements Validation

This configuration satisfies the following requirements:

- ✅ **Requirement 3.1**: Design tokens defined in Tailwind configuration (via CSS @theme)
- ✅ **Requirement 3.2**: Base background color (#1C1917 - warm stone/charcoal) included
- ✅ **Requirement 3.3**: Bento card tokens (#292524, #44403C, rounded-xl) configured
- ✅ **Requirement 3.4**: Glass component tokens (rgba(41, 37, 36, 0.5), backdrop-blur-md) configured
- ✅ **Requirement 3.5**: Accent colors (Amber and Orange) for CTAs and highlights included
- ✅ **Requirement 3.6**: Semantic status colors (Green/Amber/Red) for state badges included
- ✅ **Requirement 3.7**: Dark mode enabled via `class` strategy
- ✅ **Requirement 3.8**: Theme preference can be persisted (via localStorage in ThemeContext)

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

## Design Principles

### Warm Stone Theme
The warm stone palette creates a sophisticated, earthy aesthetic that feels grounded and professional. The stone-based neutrals (charcoal through warm white) provide excellent readability while maintaining visual warmth.

### Color Separation
- **Accent Colors**: Reserved for CTAs, highlights, and interactive elements that need attention
- **Status Colors**: Dedicated semantic colors for state communication (success/warning/error)
- This separation ensures clear visual hierarchy and prevents color confusion

### Glass Morphism
The glass effect with backdrop blur creates depth and visual interest while maintaining content legibility. Semi-transparent backgrounds allow underlying gradients and content to show through subtly.

## Future Enhancements

- Add animation utilities for micro-interactions
- Expand status color palette for info/neutral states
- Consider adding more semantic color tokens for specialized states
- Create reusable component library based on these tokens
- Add high contrast mode for accessibility
