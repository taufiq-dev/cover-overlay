// app.styles.ts
import styled, { createGlobalStyle } from "styled-components";
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

// Click or drag on the photo to move the focus point. touch-action: none keeps a drag on a phone
// from scrolling the page instead.
export const Picker = styled.div`
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  cursor: crosshair;
  touch-action: none;
  user-select: none;
  background: #0d0d0d;

  img {
    display: block;
    width: 100%;
    height: auto;
    pointer-events: none;
  }
`;

export const FocusDot = styled.span`
  position: absolute;
  width: 18px;
  height: 18px;
  margin: -9px 0 0 -9px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: rgb(47 95 208 / 0.6);
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.5);
  pointer-events: none;
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
