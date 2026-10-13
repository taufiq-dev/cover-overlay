import { DEFAULT_ASPECT_RATIO, DEFAULT_FOCUS } from "./constants";
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
  imageFocus = DEFAULT_FOCUS,
  imageAspectRatio = DEFAULT_ASPECT_RATIO,
  title,
  children,
  titlePosition = OVERLAY_TYPE.TITLE_SIDE,
  className,
}: CoverOverlayProps) => (
  <Wrapper className={className} data-testid="cover-overlay">
    <CoverBackground
      imageUrl={imageUrl}
      focus={imageFocus}
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
