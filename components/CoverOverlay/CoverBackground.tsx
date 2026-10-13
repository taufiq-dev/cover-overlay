import type { CSSProperties } from "react";
import styled, { css } from "styled-components";

import { LAYOUT, MOBILE_TITLE, desktopQuery } from "./constants";
import { easedRamp } from "./easedRamp";
import { OVERLAY_TYPE, type FocusPoint, type OverlayType } from "./types";

/**
 * Decorative photo layer behind CoverOverlay's content. Purely visual (aria-hidden).
 *
 * One uncropped photo for every viewport; all cropping and framing is CSS, tuned with
 * the custom properties on <Layer>. The subject's point in the photo (imageFocus) is
 * passed in as --cover-focus-x / --cover-focus-y so any photo can be framed the same way.
 *
 * - Mobile: a photo band under the app header, the subject behind the title, the band
 *   fading to black towards the bottom.
 * - Desktop, title on the side: the photo fills the empty area right of the cards with
 *   the subject centred in it. It is hidden behind the cards and fades in with an eased
 *   mask centred on their right edge, under a left-to-right darkening overlay.
 * - Desktop, title on top: full-bleed photo under a top-to-bottom darkening overlay.
 */

/** Subject's centre below the band top on mobile: title top padding + half the title text. */
const MOBILE_TITLE_TEXT = MOBILE_TITLE.fontSize * MOBILE_TITLE.lineHeight * MOBILE_TITLE.lines;
const MOBILE_SUBJECT_TOP = MOBILE_TITLE.paddingTop + MOBILE_TITLE_TEXT / 2;

type CustomProperties = CSSProperties & Record<`--${string}`, string>;

type CoverBackgroundProps = {
  imageUrl: string;
  focus: FocusPoint;
  aspectRatio: number;
  titlePosition: OverlayType;
};

export const CoverBackground = ({ imageUrl, focus, aspectRatio, titlePosition }: CoverBackgroundProps) => {
  const vars: CustomProperties = {
    "--cover-focus-x": `${focus.x}%`,
    "--cover-focus-y": `${focus.y}%`,
    /* Photo height below the subject's point, as a fraction of the photo's width. */
    "--cover-below-focus": `${+((1 - focus.y / 100) / aspectRatio).toFixed(4)}`,
  };

  return (
    <Layer aria-hidden="true" style={vars}>
      <Panel $titlePosition={titlePosition}>
        <Photo
          $titlePosition={titlePosition}
          src={imageUrl}
          // Intrinsic ratio before the image loads, so width: auto resolves immediately.
          width={Math.round(1000 * aspectRatio)}
          height={1000}
          alt=""
          decoding="async"
          // Likely the LCP element; don't lazy-load it.
          fetchPriority="high"
        />
      </Panel>
      <Scrim $titlePosition={titlePosition} />
    </Layer>
  );
};

type VariantProps = { $titlePosition: OverlayType };
const isSide = ({ $titlePosition }: VariantProps) => $titlePosition === OVERLAY_TYPE.TITLE_SIDE;

const Layer = styled.div`
  --cover-base: #0d0d0d;

  /* ---- Desktop ---- */
  /* Width of the empty area to the right of the cards. */
  --cover-space: calc(
    (100% - ${LAYOUT.contentWidth}px) * ${LAYOUT.gapRight} / ${LAYOUT.gapLeft + LAYOUT.gapRight}
  );
  /* How far the photo panel reaches back behind the cards (kept fully hidden there). */
  --cover-lead: min(320px, 25vw);
  /* Photo fade-in: --cover-fade-width long, centred on the cards' right edge. */
  --cover-fade-width: 32rem;
  --cover-fade-shift: calc(var(--cover-fade-width) / 2);
  /* CSS crop: 1 = photo height fills the panel. 1.68 puts the subject at ~22% of the
     viewport height at 1400x900. */
  --cover-zoom: 1.68;
  /* Vertical position of the subject's centre within the panel. */
  --cover-subject-top: 72.3%;

  /* ---- Mobile ---- */
  /* The band starts under the app header; override --cover-header-height from the page. */
  --cover-mobile-offset: var(--cover-header-height, 3.5rem);
  /* Photo width as a multiple of the screen width (1 = edge to edge, uncropped). */
  --cover-mobile-zoom: 1.8;
  /* Subject's horizontal position, from the left edge. */
  --cover-mobile-subject-left: 25%;
  /* Moves the photo up (positive) or down (negative) on mobile; the fade stays put. */
  --cover-mobile-shift-up: 1.5rem;
  /* Band top → subject's centre: behind the title, minus the shift. */
  --cover-mobile-subject-top: calc(${MOBILE_SUBJECT_TOP}px - var(--cover-mobile-shift-up));
  /* Fade to black, measured from the band's top: clear until --cover-mobile-fade-start,
     fully black from --cover-mobile-fade-end down (eased, so no hard edge). */
  --cover-mobile-fade-start: 0rem;
  --cover-mobile-fade-end: 7rem;

  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
  background-color: var(--cover-base);
`;

const Panel = styled.div<VariantProps>`
  /* Mobile: a band whose height ends exactly at the bottom of the photo, so the subject
     sits --cover-mobile-subject-top below its top and the fade lands on the photo's
     foreground, not on empty space. */
  position: absolute;
  top: var(--cover-mobile-offset);
  left: 0;
  right: 0;
  height: calc(
    var(--cover-mobile-subject-top) + var(--cover-mobile-zoom) * 100vw * var(--cover-below-focus)
  );
  overflow: hidden;
  /* Clear down to --cover-mobile-fade-start, black from --cover-mobile-fade-end. (The ramp
     runs bottom-up, so its offset is the distance from the bottom to the fade's end.) */
  mask-image: ${easedRamp({
    direction: "to top",
    offset: "(100% - var(--cover-mobile-fade-end))",
    span: "(var(--cover-mobile-fade-end) - var(--cover-mobile-fade-start))",
  })};

  @media ${desktopQuery} {
    top: 0;
    bottom: 0;
    height: auto;

    ${(p) =>
      isSide(p)
        ? css`
            /* Centred on the empty right-hand area: starts --cover-lead behind the cards
               and overhangs the right edge by the same amount (clipped by the layer), so
               the subject sits mid-way across the empty space at every desktop width. */
            left: calc(100% - var(--cover-space) - var(--cover-lead));
            right: calc(-1 * var(--cover-lead));
            /* Hidden behind the cards, then fades in over --cover-fade-width, centred on
               the cards' right edge. */
            mask-image: ${easedRamp({
              direction: "to right",
              offset: "(var(--cover-lead) - var(--cover-fade-shift))",
              span: "var(--cover-fade-width)",
            })};
          `
        : css`
            left: 0;
            right: 0;
            mask-image: none;
          `}
  }
`;

const Photo = styled.img<VariantProps>`
  /* Mobile: photo --cover-mobile-zoom x the screen width, bottom-aligned to the band, with
     the subject --cover-mobile-subject-left in from the left edge. */
  display: block;
  position: absolute;
  bottom: 0;
  left: var(--cover-mobile-subject-left);
  width: calc(var(--cover-mobile-zoom) * 100%);
  height: auto;
  max-width: none;
  object-fit: cover;
  object-position: var(--cover-focus-x) var(--cover-focus-y);
  transform: translateX(calc(-1 * var(--cover-focus-x)));

  @media ${desktopQuery} {
    ${(p) =>
      isSide(p)
        ? css`
            /* CSS crop: image box --cover-zoom x the panel height, moved so the subject's
               point lands at (50%, --cover-subject-top) of the panel. translate() and
               object-position use the same percentages, so her point is at the focus
               position of the box whether or not cover cropped it. min-width keeps very
               wide panels covered. */
            top: var(--cover-subject-top);
            bottom: auto;
            left: 50%;
            width: auto;
            height: calc(var(--cover-zoom) * 100%);
            min-width: 101%;
            transform: translate(
              calc(-1 * var(--cover-focus-x)),
              calc(-1 * var(--cover-focus-y))
            );
          `
        : css`
            inset: 0;
            width: 100%;
            height: 100%;
            transform: none;
          `}
  }
`;

/** Darkening for text legibility; the photo itself stays untouched. */
const Scrim = styled.div<VariantProps>`
  position: absolute;
  inset: 0;
  /* Mobile: a light dim so the white title reads over the photo. */
  background: rgb(0 0 0 / 0.2);

  @media ${desktopQuery} {
    ${(p) =>
      isSide(p)
        ? css`
            background:
              /* Bright sky behind the title. Full width: stopping at the cards' edge would
                 leave a visible seam where the photo fades in behind them. */
              ${easedRamp({ direction: "to top", max: 0.5 })} top / 100% 30% no-repeat,
              /* Left-to-right darkening: 70% black at the left edge to 26% at the right. */
              linear-gradient(to right, rgb(0 0 0 / 0.7), rgb(0 0 0 / 0.26));
          `
        : css`
            background: linear-gradient(
              180deg,
              rgb(16 16 16 / 0.7) 18.36%,
              rgb(16 16 16 / 0.3) 44.17%
            );
          `}
  }

  @media (prefers-contrast: more) {
    background-color: rgb(0 0 0 / 0.45);
  }
`;
