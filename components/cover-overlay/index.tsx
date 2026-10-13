import {
  DEFAULT_ASPECT_RATIO,
  DEFAULT_FOCUS,
  DEFAULT_FOCUS_MOBILE,
  DEFAULT_SHIFT_UP_MOBILE,
  DEFAULT_ZOOM_MOBILE,
} from "./constants";
import { CoverBackground } from "./cover-background";
import { Content, Layout, Title, Wrapper } from "./styles";
import { OVERLAY_TYPE, type CoverOverlayProps } from "./types";

/**
 * Full-page layout: a photo background, a title, and a column of cards (children).
 *
 *   <CoverOverlay imageUrl={coverUrl} title="Welcome aboard">
 *     <Card>…</Card>
 *     <Card>…</Card>
 *   </CoverOverlay>
 */
const CoverOverlay = ({
  imageUrl,
  imageFocus,
  imageFocusMobile,
  imageZoomMobile = DEFAULT_ZOOM_MOBILE,
  imageShiftUpMobile = DEFAULT_SHIFT_UP_MOBILE,
  imageAspectRatio = DEFAULT_ASPECT_RATIO,
  title,
  children,
  titlePosition = OVERLAY_TYPE.TITLE_SIDE,
  className,
}: CoverOverlayProps) => (
  <Wrapper className={className} data-testid="cover-overlay">
    <CoverBackground
      imageUrl={imageUrl}
      focus={imageFocus ?? DEFAULT_FOCUS}
      // The design photo's two defaults go together. A caller who sets imageFocus is framing
      // another photo, where the design photo's mobile offset would mean nothing.
      focusMobile={imageFocusMobile ?? imageFocus ?? DEFAULT_FOCUS_MOBILE}
      zoomMobile={imageZoomMobile}
      shiftUpMobile={imageShiftUpMobile}
      aspectRatio={imageAspectRatio}
      titlePosition={titlePosition}
    />
    <Layout $titlePosition={titlePosition}>
      {title && <Title $titlePosition={titlePosition}>{title}</Title>}
      <Content $titlePosition={titlePosition}>{children}</Content>
    </Layout>
  </Wrapper>
);

export default CoverOverlay;
export { OVERLAY_TYPE } from "./types";
export type { CoverOverlayProps, FocusPoint, OverlayType } from "./types";
