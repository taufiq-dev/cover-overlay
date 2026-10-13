import type { CSSProperties } from "react";
import styled, { css } from "styled-components";

import { CONTENT_COLUMN, LAYOUT, MOBILE_TITLE, desktopQuery } from "./constants";
import { easedFade, easedRamp } from "./eased-ramp";
import { OVERLAY_TYPE, type FocusPoint, type OverlayType } from "./types";

/**
 * Decorative photo layer behind CoverOverlay's content. Purely visual (aria-hidden).
 *
 * One uncropped photo for every viewport; all cropping and framing is CSS, tuned with
 * the custom properties on <Layer>. Each layout frames the photo around a focus point,
 * passed in as percentages of the photo: --cover-focus-x / -y on desktop and
 * --cover-mobile-focus-x / -y on mobile, so any photo can be framed the same way and
 * art-directed separately for phones.
 *
 * - Mobile: a photo band under the app header, the subject behind the title. Over it, the
 *   fade: the band split into equal slices, clear at the top, eased into the fade colour by
 *   the bottom of a chosen slice and solid below it, so the photo always fades out on itself.
 * - Desktop, title on the side: the photo fills the empty area right of the cards with
 *   the subject centred in it. It is hidden behind the cards and fades in with an eased
 *   mask centred on their right edge, under a left-to-right darkening overlay.
 * - Desktop, title on top: full-bleed photo under a top-to-bottom darkening overlay.
 */

/** Mobile focus point below the band top: title top padding + half the title text. */
const MOBILE_TITLE_TEXT = MOBILE_TITLE.fontSize * MOBILE_TITLE.lineHeight * MOBILE_TITLE.lines;
const MOBILE_SUBJECT_TOP = MOBILE_TITLE.paddingTop + MOBILE_TITLE_TEXT / 2;

type CustomProperties = CSSProperties & Record<`--${string}`, string>;

type CoverBackgroundProps = {
  imageUrl: string;
  focus: FocusPoint;
  focusMobile: FocusPoint;
  zoomMobile: number;
  shiftUpMobile: string;
  fadeBandsMobile: number;
  fadeBlackAtBandMobile: number;
  fadeColorMobile: string;
  aspectRatio: number;
  titlePosition: OverlayType;
};

export const CoverBackground = ({
  imageUrl,
  focus,
  focusMobile,
  zoomMobile,
  shiftUpMobile,
  fadeBandsMobile,
  fadeBlackAtBandMobile,
  fadeColorMobile,
  aspectRatio,
  titlePosition,
}: CoverBackgroundProps) => {
  // Whole bands only, at least one, and the black band among them.
  const bandCount = Math.max(1, Math.round(fadeBandsMobile));
  const blackAt = Math.min(bandCount, Math.max(1, Math.round(fadeBlackAtBandMobile)));

  const vars: CustomProperties = {
    "--cover-focus-x": `${focus.x}%`,
    "--cover-focus-y": `${focus.y}%`,
    "--cover-mobile-focus-x": `${focusMobile.x}%`,
    "--cover-mobile-focus-y": `${focusMobile.y}%`,
    "--cover-mobile-zoom": `${zoomMobile}`,
    "--cover-mobile-shift-up": shiftUpMobile,
    "--cover-mobile-fade-color": fadeColorMobile,
    /* Photo height below the mobile focus point, as a fraction of the photo's width. */
    "--cover-below-focus": `${+((1 - focusMobile.y / 100) / aspectRatio).toFixed(4)}`,
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
        <FadeBands
          style={{
            // One gradient over all the bands, reaching the end colour at the bottom of band
            // blackAt. Not a slice per band: where two painted bands meet mid-pixel (Chrome at a
            // fractional device pixel ratio or zoom), it leaves a light line.
            background: easedFade({
              color: "var(--cover-mobile-fade-color)",
              end: blackAt / bandCount,
            }),
          }}
        >
          {/* Paint nothing; they mark the bands' bounds for a host or a debug outline. */}
          {Array.from({ length: bandCount }, (_, index) => (
            <div key={index} data-cover-band={index + 1} />
          ))}
        </FadeBands>
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
  /* Width of the empty area to the right of the cards: the page grid's third column. The
     percentages resolve where the property is used, against this layer's width, which is the
     page width the grid's columns are a share of. */
  --cover-space: calc(
    (100% - ${CONTENT_COLUMN}) * ${LAYOUT.gapRight} / ${LAYOUT.gapLeft + LAYOUT.gapRight}
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
  /* --cover-mobile-zoom (photo width as a multiple of the screen width) and
     --cover-mobile-shift-up (moves the photo, not the fade) are set inline from the
     imageZoomMobile / imageShiftUpMobile props, like the focus points: they belong to the
     photo, not to the layout. */
  /* Band top → the mobile focus point: behind the title, minus the shift. */
  --cover-mobile-subject-top: calc(${MOBILE_SUBJECT_TOP}px - var(--cover-mobile-shift-up));
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
  /* Mobile: below the photo band the screen is the fade's end colour, so the last band runs
     straight into it. */
  background-color: var(--cover-mobile-fade-color);

  @media ${desktopQuery} {
    background-color: var(--cover-base);
  }
`;

const Panel = styled.div<VariantProps>`
  /* Mobile: a band whose height ends exactly at the bottom of the photo, so the subject
     sits --cover-mobile-subject-top below its top. The fade bands fill it, so the fade is
     always on the photo and reaches its end colour before the photo's bottom edge. */
  position: absolute;
  top: var(--cover-mobile-offset);
  left: 0;
  right: 0;
  height: calc(
    var(--cover-mobile-subject-top) + var(--cover-mobile-zoom) * 100vw * var(--cover-below-focus)
  );
  overflow: hidden;

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
          `}
  }
`;

const Photo = styled.img<VariantProps>`
  /* Mobile: photo --cover-mobile-zoom x the screen width, bottom-aligned to the band, with
     the mobile focus point centred across the screen. The photo's box keeps the photo's
     own ratio here, so object-fit crops nothing and the translate alone places the point. */
  display: block;
  position: absolute;
  bottom: 0;
  left: 50%;
  width: calc(var(--cover-mobile-zoom) * 100%);
  height: auto;
  max-width: none;
  object-fit: cover;
  object-position: var(--cover-mobile-focus-x) var(--cover-mobile-focus-y);
  transform: translateX(calc(-1 * var(--cover-mobile-focus-x)));

  @media ${desktopQuery} {
    object-position: var(--cover-focus-x) var(--cover-focus-y);

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

/**
 * The mobile fade, over the photo: one gradient the photo band's height, over equal, empty band
 * divs (see CoverBackground). Desktop frames the photo with masks and scrims instead.
 */
const FadeBands = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;

  > * {
    flex: 1;
  }

  @media ${desktopQuery} {
    display: none;
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
