---
type: Reference
title: Design System
description: Startline's dark-theme design system — color tokens, typography, component anatomy, brand voice, and layout rules for the fitness event platform.
tags: [startline, design-system, ui, dark-theme, typography, components]
resource: /design/design.md
---

# Design System

The Startline design system is defined in [/design/design.md](/design/design.md). It is a **dark-only** theme with a single electric-lime accent (`#B3E153`), inspired by motorsport instrument panels.

## Brand Voice

- **Athlete-first, second person**: "you", rarely "we". Action-led: *Find Your Start Line.*
- **Australian English**: organiser (not organizer), state codes (NSW, VIC), AUD
- **UI chrome is UPPERCASE** with wide tracking; body copy is sentence case in Inter
- **Numbers carry weight**: prices, dates, distances in bold-italic display
- **No emoji**, line icons (Lucide) only
- **Tone by surface**: athlete = motivational; checkout = reassuring; organiser/admin = businesslike

## Color System

Dark-only (`color-scheme: dark`), one accent color.

### Surfaces
| Token | Hex | Use |
|---|---|---|
| `--darker` | `#141414` | Page background |
| `--dark` | `#1F1F1F` | Cards, panels, nav |
| `--dark-light` | `#2A2A2A` | Input wells, subtle fills |
| `--dark-lighter` | `#353535` | Hairline borders, dividers |

### Text
| Token | Hex | Use |
|---|---|---|
| `--light` | `#F5F7FA` | Primary text, display |
| `--muted` | `#8A8F98` | Secondary / meta |
| `--muted-dark` | `#6E737B` | Tertiary / disabled |

### Status Colors
| Role | Foreground | Surface |
|---|---|---|
| Brand / success / live | `#B3E153` | `rgb(179 225 83 / .10)` |
| Info / pending | `#60A5FA` | `rgb(96 165 250 / .12)` |
| Danger / rejected | `#F87171` | `rgb(248 113 113 / .12)` |
| Warning / draft | `#FBBF24` | `rgb(251 191 36 / .12)` |

## Typography

Two font families:

- **Chakra Petch** (Google Font) — structural: display titles (700 italic, tight tracking), labels/eyebrows/buttons (uppercase, wide tracking)
- **Inter** — body/prose: descriptions, help text, form values (sentence case)

Scale: 10px (eyebrow) through 88px (display). Never below 24px on slides; 12pt minimum in print.

## Core Components

| Component | Style |
|---|---|
| **Buttons** | Machined primary (gradient + hard green offset shadow), outline, ghost, lime solid, destructive. Uppercase, 700, `0.12em` tracking |
| **Badges/Status** | Fully round pill, uppercase 10.5px `0.13em`. Uses semantic status colors |
| **Cards** | `#1F1F1F` + `#353535` hairline, 14px radius. Interactive → lift + green border |
| **Inputs** | `#2A2A2A` well, hairline border, 10–12px radius, green focus border |
| **Top Nav** | 56px, `rgb(20 20 20 / .92)` + backdrop blur, hairline bottom |
| **Modals** | `#1F1F1F` surface, 12–18px radius, soft shadow, blurred overlay |

## Layout

- **4px base grid**. Flex/grid with `gap` over margins
- **Content rails**: listings/hero/detail max 1440px; portal inner rail 1200–1240px; narrow flows 600px
- **Top nav**: fixed 56px. Mobile hit targets ≥44px
- **Corners**: cards/inputs/buttons 12–14px, media tiles 16px, hero/search 24px

## Motion

- Easing: `cubic-bezier(0.2,0.7,0.2,1)`, duration 150–300ms
- Vocabulary: fades + short upward slides, modal scale/opacity, lime shimmer sweep
- Always respects `prefers-reduced-motion`

## Textures (Optional HUD Depth)

- `.startline-scan-grid` — 40px lime grid at 5% (dashboards, hero overlays)
- `.startline-hero-topo` — layered radial lime glows + diagonal contour hatching
- Used sparingly, never stacked, never above 50% opacity

## Related

- [Architecture](/openwiki/architecture/overview.md) — how the design surfaces across three portals
- [Quickstart](/openwiki/quickstart.md) — full platform overview
