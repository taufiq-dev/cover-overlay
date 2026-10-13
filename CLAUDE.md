# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`<CoverOverlay>`, a React full-page layout: a photo background, a title, and a column of cards
(its children). One uncropped photo serves every viewport, and all framing is CSS keyed to the
subject's position in the photo (`imageFocus`). There are three layouts: mobile (< 768px, title
always on top), desktop `TITLE_SIDE`, and desktop `TITLE_TOP`. `README.md` describes each.

## Layout

```
components/CoverOverlay/   the component. Plain folder: no package.json, no node_modules, no build step
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
  (`styles.ts`) and the background (`CoverBackground.tsx`). The desktop grid is
  `168fr | 634px | 638fr`, and the background derives the empty right-hand area from the same
  ratio. On mobile, the subject's vertical position is computed from the title's padding,
  font size, line height and line count. **Changing the title's typography moves the photo.**
- **Focus point.** `imageFocus` becomes `--cover-focus-x/y`. The photo is placed with
  `translate(-focus)` and `object-position: focus`, which use the same percentages, so the
  subject's point lands in the same place whether or not `object-fit: cover` crops it.
- **Mobile band height** is derived from `imageAspectRatio` (`--cover-below-focus`), so the band
  ends exactly at the photo's bottom edge and the fade lands on the photo, not on empty space. A
  wrong aspect ratio shows up as a band that is too short or too long.
- **Tuning knobs** (`--cover-zoom`, `--cover-mobile-zoom`, `--cover-mobile-shift-up`, …) are
  declared on `Layer`, not on an ancestor, so a host page can't override them by inheritance.
  The exception is `--cover-header-height`, which is read through a fallback. The desktop knobs
  only affect `TITLE_SIDE`; `TITLE_TOP` is a plain full-bleed `object-fit: cover`.
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
