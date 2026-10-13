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
  /** Where the subject is in the photo. Defaults to the design photo's subject. */
  imageFocus?: FocusPoint;
  /** Photo width / height. Needed to size the mobile band. Defaults to 3:2-ish (2576 / 1714). */
  imageAspectRatio?: number;
  title?: string;
  /** The cards. Stacked in the content column with a 16px gap. */
  children: ReactNode;
  titlePosition?: OverlayType;
  className?: string;
};
