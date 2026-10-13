import type { ReactNode } from "react";

/** Where the title sits relative to the cards on desktop. Mobile always stacks it on top. */
export const OVERLAY_TYPE = {
  TITLE_SIDE: "SIDE",
  TITLE_TOP: "TOP",
} as const;

export type OverlayType = (typeof OVERLAY_TYPE)[keyof typeof OVERLAY_TYPE];

/** The subject's centre in the photo, as percentages of its width (x) and height (y). */
export type FocusPoint = { x: number; y: number };

export type CoverOverlayProps = {
  /** One uncropped photo, used for every viewport. Cropping and framing are CSS. */
  imageUrl: string;
  /**
   * The point the desktop layouts frame the photo around, usually the subject. Defaults to the
   * design photo's subject.
   */
  imageFocus?: FocusPoint;
  /**
   * The point the mobile band frames the photo around: it lands centred across the screen and
   * behind the title. Set it apart from imageFocus to place the subject off-centre on phones, or
   * to crop to something else there. Defaults to imageFocus; with neither set, to the design
   * photo's mobile framing.
   */
  imageFocusMobile?: FocusPoint;
  /** Mobile photo width as a multiple of the screen width: 1 is edge to edge. Defaults to 1.8. */
  imageZoomMobile?: number;
  /**
   * Moves the mobile photo up (positive) or down (negative) from the title, as any CSS length;
   * the band's fade stays put. Defaults to "1.5rem".
   */
  imageShiftUpMobile?: string;
  /** The mobile fade splits the photo, top to bottom, into this many equal bands. Defaults to 5. */
  fadeBandsMobile?: number;
  /**
   * The band at whose bottom the mobile fade reaches full black (1 is the top band). The fade runs
   * smoothly from transparent at the photo's top to there, and every band below stays black.
   * Defaults to 4; kept within fadeBandsMobile.
   */
  fadeBlackAtBandMobile?: number;
  /**
   * The colour the mobile fade ends in, as any CSS colour; it also fills the screen below the
   * photo. Defaults to the design's black, #0d0d0d.
   */
  fadeColorMobile?: string;
  /** Photo width / height. Needed to size the mobile band. Defaults to 3:2-ish (2800 / 1863). */
  imageAspectRatio?: number;
  title?: string;
  /** The cards. Stacked in the content column with a 16px gap. */
  children: ReactNode;
  titlePosition?: OverlayType;
  className?: string;
};
