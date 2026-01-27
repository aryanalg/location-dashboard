# Location Dashboard — NXT Dark Theme Retheme

## Overview

Rethemed `app/globals.css` from a light navy/teal theme to the NXT dark instrument-panel aesthetic. CSS-only change — zero HTML, JS, TS, or logic modifications.

---

## Design Token Changes

### Backgrounds

| Token | Before | After |
|---|---|---|
| `--bg-primary` | `#f0f4f7` (light gray) | `#0d1620` (NXT base) |
| `--bg-secondary` | `#ffffff` (white) | `#1a2332` (NXT surface) |
| `--bg-tertiary` | `#e8eef3` (pale blue) | `#141d2b` (NXT elevated) |
| `--navy-dark` | `#0f2744` | `#0d1620` |
| `--navy-primary` | `#1a365d` | `#141d2b` |
| `--navy-light` | `#2d4a6f` | `#1a2332` |

### Text

| Token | Before | After |
|---|---|---|
| `--text-primary` | `#0f2744` (dark navy) | `rgba(255,255,255, 0.9)` |
| `--text-secondary` | `#3d5a73` (muted navy) | `rgba(255,255,255, 0.6)` |
| `--text-muted` | `#7a8fa3` (gray) | `rgba(255,255,255, 0.35)` |

### Accent

| Token | Before | After |
|---|---|---|
| `--teal-primary` | `#8fd0b3` (green teal) | `#93c5fd` (NXT info blue) |
| `--teal-light` | `#b5e2cd` | `rgba(147,197,253, 0.4)` |
| `--teal-dark` | `#6bb89a` | `#60a5fa` |

### Borders

| Token | Before | After |
|---|---|---|
| `--border-color` | `#d1dce6` (solid gray) | `rgba(255,255,255, 0.1)` |

### Border Radius

| Token | Before | After |
|---|---|---|
| `--radius-sm` | `6px` | `3px` |
| `--radius-md` | `8px` | `4px` |
| `--radius-lg` | `12px` | `6px` |

### Shadows

| Token | Before | After |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | `0 1px 2px rgba(0,0,0,0.2)` |
| `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1)` | `0 4px 6px -1px rgba(0,0,0,0.3)` |
| `--shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1)` | `0 10px 15px -3px rgba(0,0,0,0.4)` |

### Unchanged (Functional)

All status colors kept as-is:

- `--status-wax: #f59e0b`
- `--status-casting: #ef4444`
- `--status-filing: #8b5cf6`
- `--status-polishing: #3b82f6`
- `--status-electro: #10b981`
- `--status-packing: #06b6d4`
- `--status-mks: #ec4899`
- `--status-outsource: #6b7280`
- `--status-other: #9ca3af`

All spacing tokens unchanged.

---

## Component-Level Changes

### Header (`.top-bar`)

- Background: `var(--navy-primary)` solid → `var(--bg-tertiary)` + `border: 1px solid var(--border-color)`
- Removed `box-shadow`
- Title: hardcoded `#ffffff` → `var(--text-primary)`
- Stat pills: `rgba(255,255,255,0.1)` → `rgba(255,255,255,0.06)`
- Stat labels: `rgba(255,255,255,0.7)` → `var(--text-muted)`
- Refresh button: `border: none` → `border: 1px solid rgba(255,255,255,0.15)`
- PO select: `border: none` → `border: 1px solid rgba(255,255,255,0.15)`, dropdown arrow SVG fill changed from white to `#999`

### Quick Actions Bar

- Added `border: 1px solid var(--border-color)`
- Buttons: `border: none` → `border: 1px solid var(--border-color)`
- Hover: was `background: var(--navy-primary); color: #fff; transform: translateY(-2px); box-shadow` → now `background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); color: var(--text-primary)` (no transform, no shadow)

### Filters Section

- Added `border: 1px solid var(--border-color)`
- Filter inputs: added `background: var(--bg-primary); color: var(--text-primary)`
- Focus ring: `rgba(143,208,179,0.2)` (teal) → `rgba(147,197,253,0.2)` (blue)
- Filter labels: `var(--text-secondary)` → `var(--text-muted)`

### Location Cards

- Replaced `box-shadow: var(--shadow-sm)` with `border: 1px solid var(--border-color)`
- Hover: was `box-shadow: var(--shadow-md); transform: translateY(-2px)` → now `background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.2)` (no transform, no shadow lift)
- Active: was `box-shadow: 0 0 0 2px var(--teal-primary)` → now `border-color: var(--teal-primary)`

### Data Table

- Table section: replaced `box-shadow` with `border`
- Table headers: hover `var(--bg-primary)` → `rgba(255,255,255,0.06)`
- Sort icon active: `var(--teal-dark)` → `var(--teal-primary)`
- Row hover: `var(--bg-tertiary)` → `rgba(255,255,255,0.03)`
- Search input: added `background: var(--bg-primary); color: var(--text-primary)`, added `::placeholder` rule

### Location Badges

Changed from light pastel backgrounds to semi-transparent status colors:

| Location | Before | After |
|---|---|---|
| Wax | `bg: #fef3c7; color: #92400e` | `bg: rgba(245,158,11,0.15); color: rgba(245,158,11,0.9)` |
| Casting | `bg: #fee2e2; color: #991b1b` | `bg: rgba(239,68,68,0.15); color: rgba(239,68,68,0.9)` |
| Filing | `bg: #ede9fe; color: #5b21b6` | `bg: rgba(139,92,246,0.15); color: rgba(139,92,246,0.9)` |
| Polishing | `bg: #dbeafe; color: #1e40af` | `bg: rgba(59,130,246,0.15); color: rgba(59,130,246,0.9)` |
| Electro | `bg: #d1fae5; color: #065f46` | `bg: rgba(16,185,129,0.15); color: rgba(16,185,129,0.9)` |
| Packing | `bg: #cffafe; color: #0e7490` | `bg: rgba(6,182,212,0.15); color: rgba(6,182,212,0.9)` |
| MKS Setting | `bg: #fce7f3; color: #9d174d` | `bg: rgba(236,72,153,0.15); color: rgba(236,72,153,0.9)` |
| Outsource | `bg: #f3f4f6; color: #374151` | `bg: rgba(107,114,128,0.15); color: rgba(107,114,128,0.9)` |

### Modals

- Background: `var(--bg-secondary)` + added `border: 1px solid var(--border-color)`
- Removed `box-shadow: var(--shadow-lg)`
- Header: `background: var(--navy-primary)` → `var(--bg-tertiary)` + `border-bottom`
- Header text: hardcoded `#ffffff` → `var(--text-primary)`
- Close button: `color: rgba(255,255,255,0.7)` → `var(--text-muted)`, hover bg: `rgba(255,255,255,0.1)` → `rgba(255,255,255,0.06)`
- Overlay: `rgba(15,39,68,0.5)` → `rgba(0,0,0,0.7)`

### PO Analytics

- Summary stat values: `color: var(--navy-primary)` → `var(--text-primary)`
- Progress section: added `border: 1px solid var(--border-color)`
- Progress bar track: `var(--bg-secondary)` → `var(--bg-primary)`
- Progress percent: `var(--navy-primary)` → `var(--text-primary)`

### Toggle Buttons (Jobs/Pieces)

- Container: added `border: 1px solid var(--border-color)`
- Active state: was `background: var(--bg-secondary); color: var(--navy-primary); box-shadow` → now `background: rgba(255,255,255,0.06); color: var(--text-primary); border: 1px solid rgba(255,255,255,0.2)`

### Bottleneck Alerts

- Warning: `background: #fef3c7; border: 1px solid #f59e0b` → `background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3)`
- High severity: `background: #fee2e2; border-color: #ef4444` → `background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3)`

### Kanban Board

- Columns: added `border: 1px solid var(--border-color)`
- Cards: replaced `box-shadow: var(--shadow-sm)` with `border: 1px solid var(--border-color)`
- Card hover: was `box-shadow: var(--shadow-md); transform: translateY(-1px)` → now `background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.2)`
- Job number: `color: var(--navy-primary)` → `var(--teal-primary)` (accent link color)
- PO link spans: `color: var(--navy-primary)` → `var(--teal-primary)`
- Qty badge: `background: var(--bg-tertiary)` → `rgba(255,255,255,0.06)`

### Query Assistant

- Input: `background: rgba(255,255,255,0.15)` → `rgba(255,255,255,0.06)`, added `border`
- Placeholder: `rgba(255,255,255,0.5)` → `var(--text-muted)`
- Focus: `rgba(255,255,255,0.25)` → `rgba(255,255,255,0.1)`
- Results dropdown: added `border: 1px solid var(--border-color)`
- Help button: added `border`, changed from `rgba(255,255,255,0.15)` bg to `rgba(255,255,255,0.06)`
- Help panel header: `background: var(--navy-primary)` → `var(--bg-tertiary)` + `border-bottom`
- Help section headings: `color: var(--navy-primary)` → `var(--text-primary)`
- Answer main value: `color: var(--navy-primary)` → `var(--text-primary)`

### Buttons

- Export button: `background: var(--navy-primary); color: #fff` → `background: rgba(255,255,255,0.06); color: var(--text-primary); border: 1px solid rgba(255,255,255,0.2)`
- Secondary button hover: `background: var(--bg-primary)` → `rgba(255,255,255,0.06)` + `border-color: rgba(255,255,255,0.2)`
- Clear all hover: `background: #ef4444; color: #fff` → `background: rgba(239,68,68,0.15); color: rgba(248,113,113,0.9)` (subtler)

### View Toggle

- Container: added `border: 1px solid var(--border-color)`
- Active button: was `background: var(--bg-secondary); color: var(--navy-primary); box-shadow` → now `background: rgba(255,255,255,0.06); color: var(--text-primary); border: 1px solid rgba(255,255,255,0.2)`

### Sign-In Page

- Container background: `linear-gradient(navy-dark, navy-primary)` → flat `var(--bg-primary)`
- Card: replaced `box-shadow` with `border: 1px solid var(--border-color)`
- Logo heading: `color: var(--navy-primary)` → `var(--text-primary)`
- Sign-in button: `background: var(--navy-primary); color: #fff` → `background: rgba(255,255,255,0.06); color: var(--text-primary); border: 1px solid rgba(255,255,255,0.2)`

### KPI Cards

- Added `border: 1px solid var(--border-color)`
- KPI values: `color: var(--navy-primary)` → `var(--text-primary)`

### Multi-Select Component

- Trigger: updated border/bg colors to dark theme rgba values
- Hover: `border-color: var(--navy-light)` → `rgba(255,255,255,0.2)`
- Selected option: `rgba(143,208,179,0.1)` → `rgba(147,197,253,0.08)`
- Action button hover: `background: var(--navy-primary); color: #fff` → `rgba(255,255,255,0.1)`
- Search input: added `background: var(--bg-primary); color: var(--text-primary)`

### Display Mode Toggle

- Container: `rgba(255,255,255,0.1)` → `rgba(255,255,255,0.06)` + `border`
- Active button: `color: var(--navy-primary); background: #ffffff` → `color: var(--text-primary); background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2)`

### Selection Info / Table Enhancements

- Selection info: `background: var(--teal-light); color: var(--navy-primary)` → `background: rgba(147,197,253,0.08); border: 1px solid rgba(147,197,253,0.2); color: var(--text-primary)`
- Selected rows: `rgba(143,208,179,0.15/0.25)` → `rgba(147,197,253,0.08/0.12)`

### Inline Query Results

- Background: `var(--teal-light)` → `rgba(147,197,253,0.08)` + `border: 1px solid rgba(147,197,253,0.2)`
- Text colors: `var(--navy-primary/light)` → `var(--text-primary/secondary)`

### Pie Chart

- Center: `box-shadow: inset rgba(0,0,0,0.05)` → `inset rgba(0,0,0,0.3)`
- Center value: `color: var(--navy-primary)` → `var(--text-primary)`

### Urgency Cards

- Added `border: 1px solid var(--border-color)`

### Misc

- Body: added `-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale`
- All `transition: all 0.15s ease` → `transition: all 150ms ease` (NXT convention)
- Hover transforms removed from cards/buttons (NXT: no scale/translateY on hover)
- Analytics panel: replaced `box-shadow` with `border`
- Filter row: replaced `box-shadow` with `border`

---

## Design Principles Applied

1. **Surfaces defined by borders, not shadows** — replaced all `box-shadow` elevation with `border: 1px solid var(--border-color)`
2. **Subdued hover states** — background opacity shifts (`rgba(255,255,255, 0.03-0.1)`) instead of transform/shadow changes
3. **Consistent border treatment** — all interactive elements get `border: 1px solid` with rgba white at appropriate opacity
4. **Text hierarchy through opacity** — three tiers: 0.9 (primary), 0.6 (secondary), 0.35 (muted)
5. **Functional color preserved** — status colors untouched; only decorative colors changed
6. **Accent as info-blue** — replaced teal with `#93c5fd` to match NXT info color for links, active states, focus rings
