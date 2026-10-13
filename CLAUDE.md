# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`<CoverOverlay>`, a React full-page layout: a photo background, a title, and a column of cards
(its children). One uncropped photo serves every viewport, and all framing is CSS keyed to the
subject's position in the photo (`imageFocus`). There are three layouts: mobile (< 768px, title
always on top), desktop `TITLE_SIDE`, and desktop `TITLE_TOP`. `README.md` describes each.

## Layout

```
components/cover-overlay/  the component. Plain folder: no package.json, no node_modules, no build step
cover-overlay-demo/        rsbuild app that exercises it; also where it is type-checked
```

`components/` has no dependencies of its own. Its bare imports (`react`, `styled-components`)
resolve against the demo's `node_modules` via two parallel aliases that must stay in sync when
adding an import:

- `cover-overlay-demo/tsconfig.json` → `paths` (for `tsc`)
- `cover-overlay-demo/rsbuild.config.ts` → `resolve.alias` + `tools.rspack.resolve.modules` (for the bundler)

The demo imports the component as `@cover-overlay` and its files as `@cover-overlay/*`.

## Commands

All run from `cover-overlay-demo/` (pnpm):

```sh
pnpm dev         # http on 0.0.0.0:3002, reachable from a phone on the LAN
pnpm typecheck   # tsc --noEmit; covers ../components too. The only check in the repo
pnpm build       # rsbuild build → dist/
pnpm run deploy  # build + wrangler deploy (static-assets-only Worker)
```

There are **no tests and no linter**. Run `pnpm typecheck` after any change under either folder.
Layout changes need a look in a browser on both sides of the 768px breakpoint (`desktopQuery` in
`constants.ts`), and for both `titlePosition` values on desktop.

## How the background works

- **Stacking.** `Wrapper` (`styles.ts`) has `isolation: isolate`, so the background `Layer`
  (`position: fixed; z-index: -1`) sits above the page's own background but below the cards. The
  photo stays put while the cards scroll over it.
- **Shared geometry.** `LAYOUT` and `MOBILE_TITLE` in `constants.ts` drive both the page grid
  (`styles.ts`) and the background (`cover-background.tsx`). The desktop grid is
  `168fr | CONTENT_COLUMN | 638fr`. `CONTENT_COLUMN` is `min(634px, 634/1440 of the page)`, so
  below 1440px the cards, both gaps and the side title keep the design's proportions, and above
  it only the gaps grow. The background derives the empty right-hand area from the same
  expression. The mobile grid and the cards' own grid (`Content`) have one explicit
  `minmax(0, 1fr)` column: an implicit, auto-sized one grows to fit a host card that is wide
  but allowed to shrink (`width: 634px; max-width: 100%`), pushing it over the side title. On mobile, the focus point's vertical position is computed from the title's padding,
  font size, line height and line count. **Changing the title's typography moves the photo.**
- **Focus points.** `imageFocus` becomes `--cover-focus-x/y` (desktop) and `imageFocusMobile`
  becomes `--cover-mobile-focus-x/y` (mobile, centred across the screen). `index.tsx` resolves
  the defaults: mobile falls back to `imageFocus`, and only with neither set to
  `DEFAULT_FOCUS_MOBILE`, which belongs to the design photo. The photo is placed with
  `translate(-focus)` and `object-position: focus`, which use the same percentages, so the
  point lands in the same place whether or not `object-fit: cover` crops it.
- **Mobile band height** is derived from `imageAspectRatio` and the mobile focus's y
  (`--cover-below-focus`), so the band ends exactly at the photo's bottom edge. A wrong aspect
  ratio shows up as a band that is too short or too long.
- **Mobile fade** is `FadeBands`: one eased gradient (`easedFade()`) the photo band's height, from
  transparent to `fadeColorMobile` by the bottom of band `fadeBlackAtBandMobile` of
  `fadeBandsMobile`, solid below. Its height is the photo's, so the fade always completes on the
  photo and never leaves a hard edge. Below the band the layer's mobile background is the same
  colour, so the fade runs into it. The band divs inside (`data-cover-band="1…N"`) only mark the
  bands and paint nothing: don't paint a slice per band, because Chrome leaves a light line where
  two painted boxes meet mid-pixel (at a fractional device pixel ratio or browser zoom).
- **Per-photo values are props; layout values are knobs.** The focus points, the mobile zoom and
  shift, and the mobile fade belong to a photo, so they are props, set as inline custom properties
  on `Layer` or as the fade's style (defaults in `constants.ts`). Tuning knobs
  (`--cover-zoom`, `--cover-subject-top`, `--cover-fade-width`, …) are declared in `Layer`'s CSS,
  not on an ancestor, so a host page can't override them by inheritance. The exception is `--cover-header-height`, which is read
  through a fallback. The desktop knobs only affect `TITLE_SIDE`; `TITLE_TOP` is a plain
  full-bleed `object-fit: cover`.
- **`easedRamp()`** builds a 16-stop eased gradient. It is used both as a `mask-image` (where alpha
  means visibility) and as a darkening scrim. A plain two-stop gradient shows banding and a hard
  edge, so don't replace it with one.

## Conventions

- **TypeScript is strict**, including `noUncheckedIndexedAccess`.
- **Comments explain why, not what.** Match the existing register.
- **Custom properties are prefixed `--cover-`**: the component renders inside a host page that may
  define its own.
- **The demo's Tuning card** reads the knobs' defaults from the rendered layer, and overrides them
  with a `[data-testid="cover-overlay"] > [aria-hidden="true"]` rule. If you rename a knob, change
  its unit, or change that DOM structure, update `KNOB_GROUPS` and `TuningStyle` in
  `cover-overlay-demo/src/`. A knob whose default is no longer a plain value shows as disabled.
- **The bundled photo** (`cover-overlay-demo/public/cover.webp`) is the design photo, and
  `DEFAULT_FOCUS` / `DEFAULT_ASPECT_RATIO` describe it. Replacing it means updating those too.
