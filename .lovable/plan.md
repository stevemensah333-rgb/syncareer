
## Plan: Fix tiny logo by tightening the SVG viewBox

### Root cause
The uploaded SVG has a 1440×810 viewBox but the actual logo glyph only occupies the center ~316×260 region (positioned at offset 562, 274). So ~75% of the rendered image is transparent padding — which is why `h-14` looks like a tiny icon.

### Fix
Update the SVG's `viewBox` to crop tightly around the glyph. Change:
- `viewBox="0 0 1440 809.999993"` → `viewBox="540 260 360 290"` (approx tight crop around the mark)
- Remove the fixed `width="1920"` and `height="1080"` attributes so the image scales purely from the parent's `h-*` class.

This makes the rendered glyph ~4× larger at the same `h-14`, with no other code changes needed.

### Optional secondary tweak
If after the viewBox fix the logo still feels under-weighted next to the wordmark, bump:
- LandingHeader/Navbar: `h-14` → `h-16` (header `h-20` already has room)
- LandingFooter: `h-12` → `h-14`
- AdminLayout: `h-11` → `h-12`

### Files modified
| File | Change |
|------|--------|
| `src/assets/syncareer-logo.svg` | Tighten viewBox, drop fixed width/height |
| `src/components/landing/LandingHeader.tsx` | (optional) bump `h-14` → `h-16` |
| `src/components/layout/Navbar.tsx` | (optional) bump `h-14` → `h-16` |
| `src/components/landing/LandingFooter.tsx` | (optional) bump `h-12` → `h-14` |
| `src/components/layout/AdminLayout.tsx` | (optional) bump `h-11` → `h-12` |

After approval I'll verify the exact tight-crop coordinates by inspecting the path data, then apply the changes and re-screenshot.
