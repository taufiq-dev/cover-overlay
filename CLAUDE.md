# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

`<CoverOverlay>`, a React full-page layout: a photo background, a title, and a column of cards.
One uncropped photo serves every viewport, and all framing is CSS keyed to the subject's position
(`imageFocus`). `README.md` describes the three layouts.

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
Layout changes need a look in a browser at both sides of the 768px breakpoint.

## Conventions

- **TypeScript is strict**, including `noUncheckedIndexedAccess`.
- **Comments explain why, not what.** Match the existing register.
- **Layout numbers live in `constants.ts`** (`LAYOUT`, `MOBILE_TITLE`). The page grid and the
  background both read them, so they can't drift apart.
- **Tuning custom properties are prefixed `--cover-`** and declared on the background layer in
  `CoverBackground.tsx`. The demo's Tuning card reads their defaults off the rendered layer and
  overrides them with a `[data-testid="cover-overlay"] > [aria-hidden="true"]` rule. If you
  rename a knob, change its unit, or change that DOM structure, update `KNOB_GROUPS` and
  `TuningStyle` in the demo. A knob whose default is no longer a plain value shows as disabled.
