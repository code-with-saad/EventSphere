# EventSphere Design System — "Voltage"

Replaces the previous "Nano Expo" indigo/cyan system. Dark-first, energetic/bold personality for a multi-role event and expo management SaaS.

## Rationale

Previous system (indigo/cyan, soft glow-blob heroes, rounded SaaS-card kit) matched generic AI-generated design defaults. This system uses a single high-saturation accent against near-black, avoiding gradient blobs, uniform card shadows, and template chrome (no ALL-CAPS eyebrows, no "→" appended to CTAs, no middle-dot meta strings).

## Color tokens

| Token | Hex | Use |
|---|---|---|
| `--bg-base` | `#0A0A0C` | Page background (near-black, not navy) |
| `--bg-surface-1` | `#151517` | Cards, panels, inputs — barely lifted off base |
| `--bg-surface-2` | `#1C1C1F` | Nested/raised elements (modals, dropdowns) |
| `--border` | `#26262A` | Default hairline border |
| `--border-strong` | `#3A3A3F` | Hover/focus border |
| `--accent` | `#FF4D2E` | Primary accent — CTAs, active states, links, focus rings |
| `--accent-bg` | `#2C0B03` | Accent tint background (badges, pills, active nav item bg) |
| `--accent-hover` | `#E8451F` | Accent hover state |
| `--text-primary` | `#F2F1ED` | Headings, primary body text |
| `--text-secondary` | `#8A8A8E` | Supporting text, labels |
| `--text-muted` | `#5C5C60` | Placeholders, disabled, timestamps |
| `--success` | `#5DCAA5` | Approved/published/paid states only |
| `--warning` | `#EF9F27` | Pending states only |
| `--danger` | `#E24B4A` | Rejected/error states only |

Rules:
- `--accent` is used ONCE per view as a filled button/CTA. Everywhere else it appears as text color, border, or the `--accent-bg` tint — never as a second competing filled surface.
- `--success` / `--warning` / `--danger` are reserved strictly for status semantics (application status, payment status, publish status) — never used decoratively.
- Glassmorphism (translucent surface + backdrop-blur) is the standard surface treatment across nav, cards, and modals. Apply blur at the container level for dense lists, not per-item, to avoid performance issues. Status badges remain fully opaque regardless of container. No box-shadow drop shadows — depth comes from blur + translucency, not shadow.

## Typography

- **Display/headings**: A geometric sans with real character — not Inter/system-ui by default for H1/H2. Suggested: `Space Grotesk` or `General Sans` (self-host or Google Fonts).
- **Body/UI/data**: `Inter` for body copy, forms, tables, kanban cards, dashboards — anywhere density and legibility matter more than personality.
- Scale: H1 40px/500, H2 28px/500, H3 20px/500, body 15px/400, caption 13px/400.
- Sentence case everywhere. No ALL CAPS labels, no tracked-out eyebrows above headings.
- Line length under 80 characters for prose blocks (landing page copy, empty states, FAQ).

## Layout principles

- **Landing hero**: asymmetric, not centered. Headline stacked hard-left, oversized (40px+), product screenshot bleeds off the right edge.
- **Dashboards**: information-dense, left-nav + content area. Use translucent glass cards with ambient background blobs.
- **Kanban (applications)**: container-level glass background, cards on `--bg-surface-2`, status color only on a left border accent (`border-left: 3px solid var(--status-color); border-radius: 0` on that edge — no rounding on single-sided borders).
- **Numbered steps**: only for the genuinely sequential flow (Create Event → Build Form → Publish → Manage). Do not add numbering elsewhere.
- **Motion**: one deliberate hero entrance on landing page load. Hover states on buttons/cards get a simple 120ms color/border transition.

## Component defaults

- **Buttons (primary)**: `background: var(--accent)`, text `#2C0B03` (dark-on-accent, not white), `border-radius: 8px`, no shadow.
- **Buttons (secondary)**: transparent bg, `border: 1px solid var(--border-strong)`, text `var(--text-primary)`.
- **Badges/status pills**: `background: var(--accent-bg)` / relevant status-bg, text in matching bright color, `border-radius: 6px`, `font-size: 11px`. Badges remain fully opaque, never translucent.
- **Inputs**: `background: var(--bg-surface-1)`, `border: 1px solid var(--border)`, focus → `border-color: var(--accent)` with a 1px accent ring, no glow blur.
- **Cards & Modals**: translucent surface with backdrop-blur, hairline border, no drop shadow. Depth comes from translucency and blur over ambient background blobs.

## Copy voice

- Sentence case, active voice, verb-first CTAs ("Create event", not "Submit").
- Errors say what happened and what to do — no "Error:" prefix, no apologies.
- Empty states are an invitation: name the space, one-line explanation, verb CTA.
