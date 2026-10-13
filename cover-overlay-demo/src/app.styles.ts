// app.styles.ts
import styled, { createGlobalStyle, css } from "styled-components";
import CoverOverlay from "@cover-overlay";

const color = {
  surface: "#ffffff",
  border: "#e1e4e8",
  text: "#17181a",
  textMuted: "#5b6472",
  primary: "#2f5fd0",
  onPrimary: "#ffffff",
  header: "#ffffff",
} as const;

const mono = `ui-monospace, SFMono-Regular, Menlo, monospace`;

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; }

  html, body, #root { height: 100%; }

  body {
    margin: 0;
    /* Matches the cover's own base, so an overscroll bounce doesn't flash white. */
    background: #0d0d0d;
    color: ${color.text};
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 15px;
    line-height: 1.45;
    -webkit-text-size-adjust: 100%;
  }
`;

/**
 * Overrides the cover's tuning custom properties. They are declared on the background layer itself,
 * so setting them on an ancestor does nothing; this targets the layer directly, at a higher
 * specificity than its own class. Relies on the layer being the overlay's aria-hidden first child.
 */
export const TuningStyle = createGlobalStyle<{ $declarations: string }>`
  [data-testid="cover-overlay"] > [aria-hidden="true"] {
    ${({ $declarations }) => $declarations}
  }
`;

// Draws the mobile fade's band divs, so their count and heights can be seen over the photo.
export const BandOutlines = createGlobalStyle`
  [data-cover-band] {
    outline: 1px dashed rgb(255 255 255 / 0.7);
    outline-offset: -1px;
  }
`;

export const Shell = styled.div`
  min-height: 100%;
  display: flex;
  flex-direction: column;
`;

// Stands in for the host app's header, which the mobile photo band starts under.
export const AppHeader = styled.header`
  position: sticky;
  top: 0;
  z-index: 1;
  flex: none;
  height: var(--cover-header-height);
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: ${color.header};
  border-bottom: 1px solid ${color.border};
  font-weight: 600;
  overflow: hidden;
`;

export const Cover = styled(CoverOverlay)`
  flex: 1;
`;

export const Card = styled.section`
  background: ${color.surface};
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
`;

// The photo card also takes a dropped image file; the dashed outline shows it will accept one.
export const DropCard = styled(Card)<{ $dropping: boolean }>`
  outline: 2px dashed transparent;
  outline-offset: -6px;

  ${({ $dropping }) =>
    $dropping &&
    css`
      outline-color: ${color.primary};
      background: #f0f4ff;
    `}
`;

export const CardTitle = styled.h2`
  margin: 0;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${color.textMuted};
`;

export const Heading = styled.h2`
  margin: 0;
  font-size: 20px;
  letter-spacing: -0.01em;
`;

export const Lead = styled.p`
  margin: 0;
  color: ${color.textMuted};
`;

export const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
`;

export const Field = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;

  input[type="text"],
  input[type="url"],
  input[type="number"] {
    font: inherit;
    min-width: 0;
    padding: 4px 8px;
    border: 1px solid ${color.border};
    border-radius: 6px;
    background: ${color.surface};
  }

  input[type="number"] {
    width: 5.5em;
  }
`;

// Grows the text input to the row's width; the label text keeps its own size.
export const WideField = styled(Field)`
  flex: 1 1 16rem;

  input {
    flex: 1;
  }
`;

export const Button = styled.button<{ $variant?: "primary" | "secondary" }>`
  font: inherit;
  font-weight: 600;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  cursor: pointer;
  border: 1px solid ${({ $variant = "primary" }) => ($variant === "primary" ? color.primary : color.border)};
  background: ${({ $variant = "primary" }) => ($variant === "primary" ? color.primary : color.surface)};
  color: ${({ $variant = "primary" }) => ($variant === "primary" ? color.onPrimary : color.text)};

  &:active {
    opacity: 0.8;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// A file input dressed as the primary button. The input stays on top, transparent, so a click or
// tap lands on it directly and it keeps its own keyboard focus.
export const FileButton = styled.label`
  position: relative;
  display: inline-flex;
  align-items: center;
  font-weight: 600;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid ${color.primary};
  background: ${color.primary};
  color: ${color.onPrimary};
  cursor: pointer;

  &:active {
    opacity: 0.8;
  }

  &:focus-within {
    outline: 2px solid ${color.primary};
    outline-offset: 2px;
  }

  input {
    position: absolute;
    inset: 0;
    width: 100%;
    opacity: 0;
    cursor: pointer;
  }
`;

export const Mono = styled.code`
  font-family: ${mono};
  font-size: 12.5px;
`;

export const Muted = styled.span`
  color: ${color.textMuted};
`;

export const Note = styled.p`
  margin: 0;
  font-size: 13px;
  color: ${color.textMuted};
`;

export const Code = styled.pre`
  margin: 0;
  padding: 12px;
  overflow-x: auto;
  border-radius: 8px;
  background: #f4f5f7;
  font-family: ${mono};
  font-size: 12.5px;
  line-height: 1.5;
`;

// Click or drag on the photo to move the focus point. Touch scrolling stays on here; only the dot
// turns it off (see FocusDot). The box shrink-wraps the image, so the focus percentages are
// percentages of the photo even when a tall one is capped in height and narrower than the card.
export const Picker = styled.div<{ $dragging: boolean }>`
  position: relative;
  align-self: center;
  max-width: 100%;
  border-radius: 8px;
  overflow: hidden;
  /* Grabbing for the whole drag, even when the pointer runs ahead of the dot. */
  cursor: ${({ $dragging }) => ($dragging ? "grabbing" : "crosshair")};
  user-select: none;
  -webkit-user-select: none;
  background: #0d0d0d;

  &:focus-visible {
    outline: 2px solid ${color.primary};
    outline-offset: 2px;
  }

  img {
    display: block;
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: min(60vh, 520px);
    pointer-events: none;
  }
`;

/** Diameter of the focus handle, in px. The picker treats a press within it as grabbing the dot. */
export const FOCUS_DOT_SIZE = 24;
/** Diameter of the dot's touch area: a finger-sized target around the visible handle. */
export const FOCUS_DOT_TOUCH_SIZE = 44;
const FOCUS_DOT_BORDER = 2;

// Hit-testing for "grabbed the dot" is done by distance in FocusPicker; the dot takes pointer
// events only so that hovering it shows the grab cursor. A ghost dot marks the other layout's
// point: faded, dashed, and ignored by the pointer. Either may carry a D / M label.
export const FocusDot = styled.span<{ $dragging: boolean; $ghost: boolean }>`
  position: absolute;
  display: grid;
  place-items: center;
  width: ${FOCUS_DOT_SIZE}px;
  height: ${FOCUS_DOT_SIZE}px;
  margin: ${-FOCUS_DOT_SIZE / 2}px 0 0 ${-FOCUS_DOT_SIZE / 2}px;
  border: ${FOCUS_DOT_BORDER}px ${({ $ghost }) => ($ghost ? "dashed" : "solid")} #fff;
  border-radius: 50%;
  background: ${({ $ghost }) => ($ghost ? "rgb(0 0 0 / 0.35)" : "rgb(47 95 208 / 0.6)")};
  box-shadow:
    0 0 0 1px rgb(0 0 0 / 0.5),
    0 2px 6px rgb(0 0 0 / 0.35);
  opacity: ${({ $ghost }) => ($ghost ? 0.7 : 1)};
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  pointer-events: ${({ $ghost }) => ($ghost ? "none" : "auto")};
  /* A touch that starts on the dot drags it instead of scrolling the page. */
  touch-action: none;
  cursor: ${({ $dragging }) => ($dragging ? "grabbing" : "grab")};
  transform: scale(${({ $dragging }) => ($dragging ? 1.2 : 1)});
  transition: transform 120ms ease-out;

  /* The touch area: invisible, centred on the dot, and part of it for hit-testing, so a finger
     that lands near the handle still gets touch-action: none. Inset from the padding box. */
  &::before {
    content: "";
    position: absolute;
    inset: ${-(FOCUS_DOT_TOUCH_SIZE - (FOCUS_DOT_SIZE - 2 * FOCUS_DOT_BORDER)) / 2}px;
    border-radius: 50%;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

// Label | slider | value, lined up in columns so the knobs scan as a table.
export const Sliders = styled.div`
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr) 4.5em;
  align-items: center;
  gap: 4px 12px;

  input[type="range"] {
    width: 100%;
    margin: 0;
  }

  output {
    font-family: ${mono};
    font-size: 12.5px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 420px) {
    grid-template-columns: minmax(0, 1fr) 4.5em;

    label {
      grid-column: 1 / -1;
      margin-top: 4px;
    }
  }
`;

// A knob whose value differs from the component's default.
export const KnobLabel = styled.label<{ $changed: boolean }>`
  font-family: ${mono};
  font-size: 12.5px;
  font-weight: ${({ $changed }) => ($changed ? 700 : 400)};
  color: ${({ $changed }) => ($changed ? color.primary : color.text)};
`;

export const GroupLabel = styled.div`
  grid-column: 1 / -1;
  margin-top: 8px;
  font-size: 13px;
  font-weight: 600;
`;
