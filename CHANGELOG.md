# Changelog

## 0.2.0 — 2026-09-17

- Added the approved orange bold segmented LCD, with faint inactive segments.
- Show actual source, including unselectable Airplay; temporarily show VOL and level
  after local or external volume changes, without a percent symbol.
- Replaced source keys with equal-width SOURCE and EQ selector keys.
- Enlarged the red power LED and mobile volume touch targets.
- Preserve control DOM nodes during state updates to prevent lost clicks.
- Prefer native volume steps, retaining configurable volume_set fallback.
- Chromium regressions cover held clicks, native stepping, LCD timers and selectors.
- No automated commands sent to a physical device.

## 0.1.0 — 2026-09-17

- Implemented the approved 2:1 amplifier design in a standalone custom card.
- Added volume drag/steps, knob power toggle, state LEDs, source selection and EQ.
- Added configuration editor, English/Italian labels, keyboard controls and errors.
- Built a standalone module and passed Chromium scenarios with simulated entities.
- Captured light/dark screenshots of the actual implementation.
- Published an experimental GitHub release with the standalone HACS asset.
- Verified the downloaded release asset against the local SHA-256.
- No device commands or Home Assistant deployment performed.
