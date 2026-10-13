# cover-overlay

A full-page layout in React: a photo background, a title, and a column of cards. One uncropped
photo serves every viewport. All cropping and framing is CSS, keyed to a focus point in the photo,
so any photo can be framed the same way: `imageFocus` on desktop, and optionally a separate
`imageFocusMobile` to art-direct phones.

- **Mobile** (< 768px): a photo band under the app header, with the mobile focus point centred
  behind the title. A fade of equal bands over the photo runs from clear to black (or any colour)
  by a chosen band, so it always finishes on the photo. The title always stacks on top of the
  cards.
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
- upload or drop any photo, then set `imageFocus`, and optionally a separate `imageFocusMobile`,
  by clicking or dragging on it, and adjust the mobile zoom, shift and fade bands (with an outline
  toggle to see the bands);
- tune the custom properties the background is framed with, starting from the component's own
  values, and copy the changed ones back into `cover-background.tsx`;
- toggle the app header and change `--cover-header-height`, and add filler cards to make the page
  scroll.

The bundled photo is the design photo (Unsplash `Sq8rpq2KB7U`, 2800×1863 WebP), which
`DEFAULT_FOCUS`, `DEFAULT_FOCUS_MOBILE` and `DEFAULT_ASPECT_RATIO` describe.

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
  imageFocus={{ x: 49.6, y: 80 }}       // desktop framing, in % of the photo's width and height
  imageFocusMobile={{ x: 63.5, y: 80 }} // optional: lands mid-screen on phones (default: imageFocus)
  imageZoomMobile={1.8}                 // optional: photo width on phones, × the screen width
  imageShiftUpMobile="1.5rem"           // optional: moves the phone photo up (negative: down)
  fadeBandsMobile={5}                   // optional: the phone fade splits the photo into 5 bands…
  fadeBlackAtBandMobile={4}             // …and is fully faded by the bottom of the 4th
  fadeColorMobile="#0d0d0d"             // optional: the colour it fades to
  imageAspectRatio={2800 / 1863}        // sizes the mobile band
  title="Welcome aboard"
  titlePosition={OVERLAY_TYPE.TITLE_SIDE}
>
  <Card>…</Card>
  <Card>…</Card>
</CoverOverlay>
```

Leave `imageFocusMobile` out and phones centre the same point as desktop. Set it apart when the
subject should sit off-centre on phones: the design photo uses a point a quarter-screen to the
right of her, so she lands a quarter in from the left edge, clear of the centred title.

The mobile band starts under the host app's header. Set `--cover-header-height` on any ancestor
if the header is not `3.5rem` tall.
