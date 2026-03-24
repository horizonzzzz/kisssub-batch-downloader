# 2026-03-24 React Icons Refactor Context

## Decision Summary

- Project UI icons should use `react-icons` SVG components directly instead of icon characters wrapped in local helper components.
- Existing `FaGithub` usage in the options page remains as-is.
- Interactive expand/collapse controls are standardized on chevron icons instead of mixing chevrons with `+ / -` characters.
- Content-style placeholders such as `DM` are not treated as UI icons and were intentionally left unchanged.

## What Changed

- Removed the local character-based icon helper from the floating batch panel:
  - `components/batch-panel.tsx`
- Replaced batch panel action icons with direct `react-icons/hi2` SVGs:
  - settings button
  - minimize button
  - advanced-options toggle
- Replaced the options-page extraction-cadence toggle `+ / -` characters with direct `react-icons/hi2` chevrons:
  - `components/options-page.tsx`
- Simplified SCSS so icon styling targets SVG sizing/layout instead of character glyph sizing:
  - `components/batch-panel.module.scss`
  - `components/options-page.module.scss`

## Testing Coverage Added Or Updated

- Batch panel component tests now assert that:
  - the settings button renders an SVG icon
  - the minimize button renders an SVG icon
  - the advanced toggle renders an SVG icon
- Options page component tests now assert that:
  - the extraction-cadence advanced toggle renders an SVG icon

Updated test files:

- `tests/components/batch-panel.test.tsx`
- `tests/components/options-page.test.tsx`

## Validation Status

Fresh verification for this refactor:

- `pnpm test -- tests/components/batch-panel.test.tsx tests/components/options-page.test.tsx` passed
- `pnpm typecheck` passed

## Maintenance Guidance

- For future UI icon work, prefer direct `react-icons` imports at the component call site over local wrapper abstractions unless a real shared behavior emerges.
- Keep accessibility on the button, not the icon: use button `aria-label`s and mark decorative SVG icons as `aria-hidden`.
- If a new expand/collapse control is added to extension-owned UI, default to the same chevron pattern used here.
