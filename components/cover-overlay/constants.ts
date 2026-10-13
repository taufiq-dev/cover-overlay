import type { FocusPoint } from "./types";

export const COVER_BREAKPOINT = 768;
export const desktopQuery = `(min-width: ${COVER_BREAKPOINT}px)`;

/**
 * Desktop layout, from the 1440px design: 168 | 634 cards | 638.
 * The cards stay 634px; the two gaps share the leftover width in a 168 : 638 ratio.
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
export const DEFAULT_ASPECT_RATIO = 2800 / 1863;
