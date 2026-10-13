import styled, { css } from "styled-components";

import { CONTENT_COLUMN, LAYOUT, MOBILE_TITLE, desktopQuery } from "./constants";
import { OVERLAY_TYPE, type OverlayType } from "./types";

type VariantProps = { $titlePosition: OverlayType };
const isSide = ({ $titlePosition }: VariantProps) => $titlePosition === OVERLAY_TYPE.TITLE_SIDE;

/**
 * Page wrapper. `isolation: isolate` gives it its own stacking context, so the fixed
 * background (z-index: -1) stays inside it: above the page's own background, below
 * the content.
 */
export const Wrapper = styled.div`
  position: relative;
  isolation: isolate;
  min-height: 100%;
`;

export const Layout = styled.div<VariantProps>`
  /* Mobile: title on top, cards below, ${LAYOUT.stackGap} apart. One explicit column: the
     implicit one is auto-sized, so a card that is wide but allowed to shrink (say width: 634px;
     max-width: 100%) would widen it past the screen instead of shrinking. */
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  row-gap: ${LAYOUT.stackGap};
  padding: 0 ${LAYOUT.mobileGutter} 2.5rem;

  @media ${desktopQuery} {
    /* ${LAYOUT.gapLeft} | ${LAYOUT.contentWidth} | ${LAYOUT.gapRight} at 1440px, the same proportions below it, and
       above it the cards stay ${LAYOUT.contentWidth}px while the gaps share the rest. */
    grid-template-columns:
      minmax(0, ${LAYOUT.gapLeft}fr)
      ${CONTENT_COLUMN}
      minmax(0, ${LAYOUT.gapRight}fr);
    align-items: start;
    padding: ${LAYOUT.desktopTop} 0;
  }
`;

export const Title = styled.h1<VariantProps>`
  /* Mobile: full-width container (breaks out of the page gutter), padding 42 / 24 / 16. */
  margin: 0 -${LAYOUT.mobileGutter};
  padding: ${MOBILE_TITLE.paddingTop}px ${MOBILE_TITLE.paddingInline}px
    ${MOBILE_TITLE.paddingBottom}px;
  color: #fff;
  font-size: ${MOBILE_TITLE.fontSize / 16}rem;
  font-weight: 600;
  line-height: ${MOBILE_TITLE.lineHeight};
  text-align: center;
  text-wrap: balance;

  @media ${desktopQuery} {
    margin: 0;
    text-align: left;

    ${(p) =>
      isSide(p)
        ? css`
            /* In the empty area right of the cards. */
            grid-column: 3;
            grid-row: 1;
            padding: 0 3rem;
            /* Two lines at most. The column narrows with the viewport (to ~10px of text at
               768px), so a longer title is cut with an ellipsis rather than growing downwards.
               The full text stays in the DOM for screen readers. -webkit-line-clamp is the
               prefixed form every browser supports; it needs the -webkit-box display. */
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            overflow: hidden;
          `
        : css`
            /* Above the cards, same column. */
            grid-column: 2;
            grid-row: 1;
            padding: 0 0 ${LAYOUT.stackGap};
          `}
  }
`;

export const Content = styled.div<VariantProps>`
  display: grid;
  /* Cards fill the column and shrink with it. An auto-sized column would grow to fit a card's
     own width instead, pushing it over the side title on desktop. A card that cannot shrink
     (a fixed width or min-width) still overflows: the column's width is set by the layout. */
  grid-template-columns: minmax(0, 1fr);
  gap: ${LAYOUT.stackGap};
  min-width: 0;

  @media ${desktopQuery} {
    grid-column: 2;
    grid-row: ${(p) => (isSide(p) ? 1 : 2)};
  }
`;
