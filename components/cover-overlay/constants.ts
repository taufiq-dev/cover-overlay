import type { FocusPoint } from "./types";

export const COVER_BREAKPOINT = 768;
export const desktopQuery = `(min-width: ${COVER_BREAKPOINT}px)`;

/**
 * Desktop layout, from the 1440px design: 168 | 634 cards | 638.
 * Below 1440px all three columns keep those proportions, down to the breakpoint; above it the
 * cards stay 634px and the two gaps share the leftover width in a 168 : 638 ratio.
 * Used by both the page grid and the background, so they can't drift apart.
 */
export const LAYOUT = {
  contentWidth: 634,
  gapLeft: 168,
  gapRight: 638,
  /** Space between the app header and the content on desktop. */
  desktopTop: "2.5rem",
  /** Gap between stacked cards, and between the mobile title and the first card. */
  stackGap: "16px",
  /** Mobile page gutter. */
  mobileGutter: "16px",
} as const;

/** The design's frame: the three desktop columns add up to it (1440px). */
const DESIGN_WIDTH = LAYOUT.gapLeft + LAYOUT.contentWidth + LAYOUT.gapRight;

/**
 * Width of the cards column on desktop, as CSS: the design's share of the page (634 / 1440),
 * capped at 634px. The gaps take what is left in a 168 : 638 ratio, so below 1440px cards, gaps
 * and the side title all scale together. The percentage is of the page width: the grid's own
 * width in the page grid, and the fixed background layer's width (the same) in the background.
 */
export const CONTENT_COLUMN = `min(${LAYOUT.contentWidth}px, ${+((LAYOUT.contentWidth / DESIGN_WIDTH) * 100).toFixed(4)}%)`;

/** Mobile title container: padding 42 / 24 / 16 around a 24px heading at 1.25 line-height. */
export const MOBILE_TITLE = {
  paddingTop: 42,
  paddingInline: 24,
  paddingBottom: 16,
  fontSize: 24,
  lineHeight: 1.25,
  /** The design's title wraps to two lines on phones. */
  lines: 2,
} as const;

/** Defaults for the design photo (woman in yellow dress, Unsplash Sq8rpq2KB7U). */
export const DEFAULT_FOCUS: FocusPoint = { x: 49.6, y: 80 };
/**
 * The design photo on phones: she sits about 30% of the way in from the left, clear of the
 * centred title. The mobile focus is what lands mid-screen, so it is a point to her right: at
 * DEFAULT_ZOOM_MOBILE (2) the photo is twice the screen's width, so 59.5 - 49.6 = 9.9% of the
 * photo is 19.8% of the screen. It is also 1.5% below her centre, which raises her a little
 * behind the title. A different zoom moves her.
 */
export const DEFAULT_FOCUS_MOBILE: FocusPoint = { x: 59.5, y: 81.5 };
export const DEFAULT_ASPECT_RATIO = 2800 / 1863;

/** Mobile photo width as a multiple of the screen width (1 = edge to edge, uncropped). */
export const DEFAULT_ZOOM_MOBILE = 2;
/** Moves the mobile photo up from the title's centre (negative: down). Any CSS length. */
export const DEFAULT_SHIFT_UP_MOBILE = "1.5rem";

/**
 * The mobile fade: the photo split into 5 equal bands, full black at the bottom of the 4th, so
 * 80% of the way down. On a 390px phone that is about where the old 7rem fade ended, and it now
 * scales with the photo instead of being a fixed length.
 */
export const DEFAULT_FADE_BANDS_MOBILE = 5;
export const DEFAULT_FADE_BLACK_AT_BAND_MOBILE = 4;
/**
 * The colour the mobile fade ends in, which also fills the screen below the photo: the design's
 * black, the same as the desktop background's base. Any CSS colour.
 */
export const DEFAULT_FADE_COLOR_MOBILE = "#0d0d0d";
