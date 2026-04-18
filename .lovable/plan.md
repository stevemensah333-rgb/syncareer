
## Plan: Replace Syncareer logo with new transparent SVG

### Steps
1. Copy `user-uploads://Untitled_design_1.svg` to `src/assets/syncareer-logo.svg`.
2. Update all imports of the old PNG logo to point to the new SVG. Files using `@/assets/syncareer-logo.png`:
   - `src/components/landing/LandingHeader.tsx`
   - `src/components/landing/LandingFooter.tsx`
   - `src/components/layout/Navbar.tsx`
   - Plus any other matches found via search (Sidebar, layouts, etc.) — will grep before editing.
3. Adjust sizing: SVG renders crisply at any size, so heights stay similar but slightly larger where the logo is the focal point.
   - Landing header: `h-8` → `h-10`
   - Landing footer: `h-7` → `h-9`
   - Navbar: `h-8` → `h-10`
   - Anywhere else: bump by ~1 step for visual parity
4. Leave the old `syncareer-logo.png` file in place (no breakage if other untracked references exist) but all active imports will switch to the SVG.

### Files modified
| File | Change |
|------|--------|
| `src/assets/syncareer-logo.svg` | New asset (copied from upload) |
| `src/components/landing/LandingHeader.tsx` | Import SVG, bump size to `h-10` |
| `src/components/landing/LandingFooter.tsx` | Import SVG, bump size to `h-9` |
| `src/components/layout/Navbar.tsx` | Import SVG, bump size to `h-10` |
| Any other logo usages found | Switch import + size tweak |
