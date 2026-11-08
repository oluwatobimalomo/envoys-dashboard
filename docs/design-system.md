# Envoys mobile-first interface system

## Foundation

Use Ionic React for shared app controls and mobile interactions. `IonApp` is the application root; `setupIonicReact()` is initialized once in `src/index.jsx`; Ionic's core, normalize, structure, and typography styles load before the Envoys overrides. Existing React Router routes and backend flows stay in place during migration. Base UI components remain available on screens that have not moved yet.

## Brand and layout tokens

Use the CSS custom properties in `src/theme/variables.css` instead of adding new one-off brand values:

| Purpose | Token | Value |
| --- | --- | --- |
| Primary forest | `--envoys-forest` | `#1b3a2d` |
| Deep forest | `--envoys-forest-deep` | `#143526` |
| Action green | `--envoys-green` | `#187641` |
| Accent gold | `--envoys-gold` | `#d49224` |
| Page canvas | `--envoys-canvas` | `#f4f7f2` |
| Main text | `--envoys-ink` | `#19352a` |
| Supporting text | `--envoys-muted` | `#61766a` |
| Borders | `--envoys-border` | `#dce7df` |

Use the `--envoys-space-*` scale for gaps and padding, `--envoys-radius-control` for fields and compact controls, and `--envoys-radius-card` for cards. The default touch control height is 44px. Use 16px text inside controls on mobile to avoid browser zoom and keep touch forms readable.

## Component rules

- Use `FieldInput` for shared text, number, date, select, and multiline controls. It adapts Ionic events to the form handlers already used by the app.
- Keep labels visible above fields; placeholders are examples, not replacements for labels. Keep required state and error text associated with the control.
- Use `IonSelect` with `interface="popover"` for short option lists. Use a searchable combobox when the option list is long (countries, phone codes).
- Use Ionic buttons for mobile navigation and shared actions. Icon-only actions need a visible or accessible label and at least a 44px target where space permits.
- Use tabs only for a small number of peer views. Use filters for changing a list and keep filter state visible.
- Keep mobile layouts single-column by default. Use two columns only for short related fields when both controls remain usable at 320px wide; allow longer fields to span the full form width.
- Cards should fit their content, keep primary actions within reach, and avoid nested scroll areas. Long metadata should be disclosed or truncated with a clear expansion action, never clip the contact name or phone number.
- Use the existing desktop shell at wide breakpoints; mobile adaptations must not shrink desktop navigation or distort wide tables.

## Migration sequence

1. Shared tokens, Ionic initialization, and form/navigation primitives.
2. High-traffic mobile routes: call queue, assigned calls, first-timers, and event registries.
3. Remaining operational screens and admin surfaces.
4. Remove duplicate legacy styles and components only after all consumers have migrated.

Keep each route's data fetching, permission checks, and save behavior intact while its presentation moves. Review both a 390px phone viewport and a desktop viewport before merging a screen migration.
