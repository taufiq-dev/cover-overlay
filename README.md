# cover-overlay

A full-page layout in React: a photo background, a title, and a column of cards. One uncropped
photo serves every viewport. All cropping and framing is CSS, keyed to the subject's position in
the photo (`imageFocus`), so any photo can be framed the same way.

- **Mobile** (< 768px): a photo band under the app header, with the subject behind the title,
  fading to black. The title always stacks on top of the cards.
- **Desktop, `TITLE_SIDE`**: the photo fills the empty area right of the cards, with the subject
  centred in it, and fades in from behind the cards' right edge.
- **Desktop, `TITLE_TOP`**: a full-bleed photo under a top-to-bottom darkening overlay, with the
  title above the cards.

```
components/cover-overlay/  the component. Plain folder: no build step, no dependencies of its own
cover-overlay-demo/        an rsbuild app to exercise it, on desktop or a phone
```

## Running the demo

```sh
cd cover-overlay-demo
pnpm install
pnpm dev          # http://localhost:3002, also on the LAN for phones
pnpm typecheck    # tsc --noEmit; covers ../components too
```

The demo page is itself a `<CoverOverlay>`, and its cards are the controls. You can:

- switch `titlePosition`, edit `title`, and load any photo URL (its aspect ratio is measured);
- set `imageFocus` by clicking or dragging on the photo;
- tune the custom properties the background is framed with, starting from the component's own
  values, and copy the changed ones back into `cover-background.tsx`;
- toggle the app header and change `--cover-header-height`, and add filler cards to make the page
  scroll.

The bundled photo is the design photo (Unsplash `Sq8rpq2KB7U`, 2800×1863 WebP), which
`DEFAULT_FOCUS` and `DEFAULT_ASPECT_RATIO` describe.

## Deploying the demo

The demo is static, so it deploys as an assets-only Worker:

```sh
cd cover-overlay-demo
pnpm wrangler login
pnpm run deploy   # builds, then wrangler deploy
```

## Using it

```tsx
<CoverOverlay
  imageUrl={coverUrl}
  imageFocus={{ x: 49.6, y: 80 }}       // the subject, in % of the photo's width and height
  imageAspectRatio={2576 / 1714}        // sizes the mobile band
  title="Welcome aboard"
  titlePosition={OVERLAY_TYPE.TITLE_SIDE}
>
  <Card>…</Card>
  <Card>…</Card>
</CoverOverlay>
```

The mobile band starts under the host app's header. Set `--cover-header-height` on any ancestor
if the header is not `3.5rem` tall.
