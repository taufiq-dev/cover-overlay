// app.tsx
//
// A harness around <CoverOverlay>. The page is itself the overlay and these cards are its children,
// so what you see behind them is the component under test. The controls change its props; the
// tuning knobs override the custom properties its background is framed with, starting from the
// values read off the component on load, so the defaults shown are its own and cannot drift.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FormEvent,
  type PointerEvent,
} from "react";
import { OVERLAY_TYPE, type FocusPoint, type OverlayType } from "@cover-overlay";
import {
  COVER_BREAKPOINT,
  DEFAULT_FOCUS,
  DEFAULT_FOCUS_MOBILE,
  DEFAULT_SHIFT_UP_MOBILE,
  DEFAULT_ZOOM_MOBILE,
  desktopQuery,
} from "@cover-overlay/constants";
import {
  AppHeader,
  Button,
  Card,
  CardTitle,
  Code,
  Cover,
  DropCard,
  Field,
  FileButton,
  FOCUS_DOT_SIZE,
  FOCUS_DOT_TOUCH_SIZE,
  FocusDot,
  GroupLabel,
  Heading,
  KnobLabel,
  Lead,
  Mono,
  Muted,
  Note,
  Picker,
  Row,
  Shell,
  Sliders,
  TuningStyle,
  WideField,
} from "./app.styles";

/**
 * The design photo (Unsplash Sq8rpq2KB7U), served from public/. DEFAULT_FOCUS is its subject;
 * DEFAULT_FOCUS_MOBILE frames her a quarter in from the left on phones.
 */
const DESIGN_PHOTO = "/cover.webp";
const CENTRE: FocusPoint = { x: 50, y: 50 };
// The demo's shift slider works in rem, the unit the component's default is written in.
const DEFAULT_SHIFT_UP_REM = parseFloat(DEFAULT_SHIFT_UP_MOBILE);
const DEFAULT_TITLE = "Let’s get your account set up";

type CustomProperties = CSSProperties & Record<`--${string}`, string>;

type Knob = {
  name: `--cover-${string}`;
  unit: "" | "%" | "rem";
  min: number;
  max: number;
  step: number;
};

// The single-value knobs declared on the background layer. The calc()-derived ones are left out:
// they follow from these.
const KNOB_GROUPS: { label: string; knobs: Knob[] }[] = [
  {
    label: "Desktop, title on the side",
    knobs: [
      { name: "--cover-zoom", unit: "", min: 1, max: 3, step: 0.01 },
      { name: "--cover-subject-top", unit: "%", min: 0, max: 100, step: 0.1 },
      { name: "--cover-fade-width", unit: "rem", min: 0, max: 60, step: 0.5 },
    ],
  },
  {
    label: "Mobile",
    knobs: [
      { name: "--cover-mobile-fade-start", unit: "rem", min: 0, max: 20, step: 0.25 },
      { name: "--cover-mobile-fade-end", unit: "rem", min: 0, max: 20, step: 0.25 },
    ],
  },
];
const ALL_KNOBS = KNOB_GROUPS.flatMap((group) => group.knobs);

const LAYER_SELECTOR = '[data-testid="cover-overlay"] > [aria-hidden="true"]';

const formatKnob = (value: number, unit: Knob["unit"]): string => `${+value.toFixed(4)}${unit}`;

// An unregistered custom property computes to its declared text, e.g. "1.68" or "32rem". A knob is
// offered only when that text is a plain number in the unit it expects: anything else means the
// component has changed, and a slider would misrepresent the value.
const parseKnob = (raw: string, unit: Knob["unit"]): number | null => {
  const match = /^(-?\d*\.?\d+)(rem|%)?$/.exec(raw.trim());
  if (!match || (match[2] ?? "") !== unit) return null;
  return Number(match[1]);
};

const readKnobDefaults = (): Record<string, number> => {
  const layer = document.querySelector(LAYER_SELECTOR);
  if (!layer) return {};
  const style = getComputedStyle(layer);
  const defaults: Record<string, number> = {};
  for (const knob of ALL_KNOBS) {
    const value = parseKnob(style.getPropertyValue(knob.name), knob.unit);
    if (value !== null) defaults[knob.name] = value;
  }
  return defaults;
};

const useMediaQuery = (query: string): boolean => {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => matchMedia(query).matches);
};

type PhotoSize = { width: number; height: number };

/**
 * The natural size of the photo at `url`, once it has loaded; null while loading or if it failed.
 * Browsers apply EXIF orientation to naturalWidth / naturalHeight, so a phone photo taken in
 * portrait measures as portrait.
 */
const usePhotoSize = (url: string): { size: PhotoSize | null; failed: boolean } => {
  const [measured, setMeasured] = useState<{ url: string; size: PhotoSize | null } | null>(null);

  useEffect(() => {
    let current = true;
    const image = new Image();
    image.onload = () =>
      current && setMeasured({ url, size: { width: image.naturalWidth, height: image.naturalHeight } });
    image.onerror = () => current && setMeasured({ url, size: null });
    image.src = url;
    return () => {
      current = false;
    };
  }, [url]);

  if (measured?.url !== url) return { size: null, failed: false };
  return { size: measured.size, failed: measured.size === null };
};

const toPercent = (offset: number, size: number): number =>
  Math.round(Math.min(100, Math.max(0, (offset / size) * 100)) * 10) / 10;

// Arrow keys move the focus by this much, in percent; with Shift, by the larger step.
const KEY_STEP = 0.5;
const KEY_STEP_LARGE = 5;
// How far, in px, a touch on the photo may move and still count as a tap.
const TAP_SLOP = 10;
const ARROWS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};

type MarkedPoint = { point: FocusPoint; label: string; name: string };

/**
 * Click anywhere on the photo to put the focus there, or drag to move it live. Pressing on the
 * dot itself picks it up where it was grabbed, so it follows the pointer without first jumping
 * to it. The pointer is captured on press, so a drag keeps tracking outside the photo (clamped
 * to its edges) and ends cleanly wherever the button is released. With a separate mobile
 * focus, the point not being edited is drawn faded, for reference only.
 *
 * On a touch screen the photo must not swallow scrolling: it is wide and tall on a phone, and a
 * page that won't scroll over it feels stuck. So only the dot (with a finger-sized touch area,
 * touch-action: none) starts a drag there. A touch anywhere else is left to the browser, and
 * places the focus only if it ends as a tap: not cancelled for a scroll, and barely moved.
 */
const FocusPicker = ({
  src,
  active,
  other,
  onChange,
}: {
  src: string;
  active: MarkedPoint;
  other: MarkedPoint | null;
  onChange: (focus: FocusPoint) => void;
}) => {
  const focus = active.point;
  const [dragging, setDragging] = useState(false);
  // Pointer position relative to the dot's centre when it was grabbed; zero for a click elsewhere.
  const grabOffset = useRef({ x: 0, y: 0 });
  // A touch that started on the photo but off the dot, which may yet turn out to be a tap.
  const pendingTap = useRef<{ pointerId: number; x: number; y: number } | null>(null);

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    onChange({
      x: toPercent(event.clientX - grabOffset.current.x - box.left, box.width),
      y: toPercent(event.clientY - grabOffset.current.y - box.top, box.height),
    });
  };

  const endDrag = () => setDragging(false);

  return (
    <Picker
      $dragging={dragging}
      tabIndex={0}
      aria-label={`${active.name}: x ${focus.x}%, y ${focus.y}%. Arrow keys move it; hold Shift for larger steps.`}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        const box = event.currentTarget.getBoundingClientRect();
        const offset = {
          x: event.clientX - (box.left + (focus.x / 100) * box.width),
          y: event.clientY - (box.top + (focus.y / 100) * box.height),
        };
        // A finger needs a bigger target than a cursor; this matches the dot's touch area.
        const mouse = event.pointerType === "mouse";
        const grabRadius = (mouse ? FOCUS_DOT_SIZE : FOCUS_DOT_TOUCH_SIZE) / 2;
        const onDot = Math.hypot(offset.x, offset.y) <= grabRadius;
        if (!mouse && !onDot) {
          pendingTap.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
          return;
        }
        grabOffset.current = onDot ? offset : { x: 0, y: 0 };
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
        move(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) move(event);
      }}
      onPointerUp={(event) => {
        const tap = pendingTap.current;
        pendingTap.current = null;
        if (tap?.pointerId === event.pointerId && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) < TAP_SLOP) {
          grabOffset.current = { x: 0, y: 0 };
          move(event);
        }
        endDrag();
      }}
      // The browser cancels a touch it has taken over for scrolling: not a tap, not a drag.
      onPointerCancel={() => {
        pendingTap.current = null;
        endDrag();
      }}
      onLostPointerCapture={endDrag}
      onKeyDown={(event) => {
        const arrow = ARROWS[event.key];
        if (!arrow) return;
        event.preventDefault();
        const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
        const clamp = (value: number) => Math.round(Math.min(100, Math.max(0, value)) * 10) / 10;
        onChange({ x: clamp(focus.x + arrow[0] * step), y: clamp(focus.y + arrow[1] * step) });
      }}
    >
      <img src={src} alt="" draggable={false} />
      {other && (
        <FocusDot $ghost $dragging={false} style={{ left: `${other.point.x}%`, top: `${other.point.y}%` }}>
          {other.label}
        </FocusDot>
      )}
      <FocusDot $ghost={false} $dragging={dragging} style={{ left: `${focus.x}%`, top: `${focus.y}%` }}>
        {other && active.label}
      </FocusDot>
    </Picker>
  );
};

const App = () => {
  const isDesktop = useMediaQuery(desktopQuery);

  const [titlePosition, setTitlePosition] = useState<OverlayType>(OVERLAY_TYPE.TITLE_SIDE);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [imageUrl, setImageUrl] = useState(DESIGN_PHOTO);
  // The file name when the photo was uploaded; imageUrl is then an object URL.
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [draftUrl, setDraftUrl] = useState("");
  const [dropping, setDropping] = useState(false);
  const [copied, setCopied] = useState(false);
  const [focus, setFocus] = useState<FocusPoint>(DEFAULT_FOCUS);
  // null: mobile frames around the desktop focus, as the component does when imageFocusMobile
  // is left out.
  const [focusMobile, setFocusMobile] = useState<FocusPoint | null>(DEFAULT_FOCUS_MOBILE);
  // Which point the picker and sliders edit. Follows the layout on screen, so the point being
  // moved is the one the background is showing.
  const [editing, setEditing] = useState<"desktop" | "mobile">(isDesktop ? "desktop" : "mobile");
  const [zoomMobile, setZoomMobile] = useState(DEFAULT_ZOOM_MOBILE);
  const [shiftUpMobile, setShiftUpMobile] = useState(DEFAULT_SHIFT_UP_REM);
  const [headerOn, setHeaderOn] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(56);
  const [fillerCards, setFillerCards] = useState(2);

  const [knobDefaults, setKnobDefaults] = useState<Record<string, number>>({});
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  const photo = usePhotoSize(imageUrl);
  const aspectRatio = photo.size ? photo.size.width / photo.size.height : null;

  // Read before any override exists, so these are the component's own values.
  useLayoutEffect(() => setKnobDefaults(readKnobDefaults()), []);

  // An uploaded photo holds its file in memory until its object URL is revoked: release it once
  // another photo replaces it.
  useEffect(() => {
    if (!imageUrl.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  useEffect(() => setEditing(isDesktop ? "desktop" : "mobile"), [isDesktop]);

  const editingMobile = editing === "mobile" && focusMobile !== null;
  const activeFocus = editingMobile ? focusMobile : focus;
  const setActiveFocus = (update: (previous: FocusPoint) => FocusPoint) =>
    editingMobile ? setFocusMobile((previous) => update(previous ?? focus)) : setFocus(update);

  // Zoom and shift belong to a photo the way its focus points do, so a new photo starts over.
  const resetMobileFraming = () => {
    setZoomMobile(DEFAULT_ZOOM_MOBILE);
    setShiftUpMobile(DEFAULT_SHIFT_UP_REM);
  };

  const resetFraming = () => {
    const design = imageUrl === DESIGN_PHOTO;
    setFocus(design ? DEFAULT_FOCUS : CENTRE);
    setFocusMobile(design ? DEFAULT_FOCUS_MOBILE : null);
    resetMobileFraming();
  };

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const setKnob = (name: string, value: number) =>
    setOverrides(({ [name]: _previous, ...rest }) =>
      value === knobDefaults[name] ? rest : { ...rest, [name]: value },
    );

  const changedKnobs = ALL_KNOBS.filter((knob) => overrides[knob.name] !== undefined);
  const declarations = changedKnobs
    .map((knob) => `${knob.name}: ${formatKnob(overrides[knob.name] ?? 0, knob.unit)};`)
    .join("\n");

  const applyCustomPhoto = (event: FormEvent) => {
    event.preventDefault();
    const url = draftUrl.trim();
    if (!url) return;
    setImageUrl(url);
    setUploadName(null);
    // A focus point belongs to one photo; the design photo's would be arbitrary on another.
    setFocus(CENTRE);
    setFocusMobile(null);
    resetMobileFraming();
  };

  // The file never leaves the tab: an object URL points at it in memory, and nothing is uploaded.
  const applyFile = (file: File | undefined) => {
    if (!file) return;
    setImageUrl(URL.createObjectURL(file));
    setUploadName(file.name);
    setFocus(CENTRE);
    setFocusMobile(null);
    resetMobileFraming();
  };

  const applyDesignPhoto = () => {
    setImageUrl(DESIGN_PHOTO);
    setUploadName(null);
    setFocus(DEFAULT_FOCUS);
    setFocusMobile(DEFAULT_FOCUS_MOBILE);
    resetMobileFraming();
  };

  const usage = [
    "<CoverOverlay",
    uploadName ? `  imageUrl={photoUrl} // ${uploadName}` : `  imageUrl=${JSON.stringify(imageUrl)}`,
    `  imageFocus={{ x: ${focus.x}, y: ${focus.y} }}`,
    focusMobile && `  imageFocusMobile={{ x: ${focusMobile.x}, y: ${focusMobile.y} }}`,
    zoomMobile !== DEFAULT_ZOOM_MOBILE && `  imageZoomMobile={${zoomMobile}}`,
    shiftUpMobile !== DEFAULT_SHIFT_UP_REM && `  imageShiftUpMobile="${shiftUpMobile}rem"`,
    aspectRatio !== null && `  imageAspectRatio={${+aspectRatio.toFixed(4)}}`,
    title && `  title=${JSON.stringify(title)}`,
    `  titlePosition={OVERLAY_TYPE.${titlePosition === OVERLAY_TYPE.TITLE_SIDE ? "TITLE_SIDE" : "TITLE_TOP"}}`,
    ">",
    "  {cards}",
    "</CoverOverlay>",
  ]
    .filter(Boolean)
    .join("\n");

  const copyUsage = () =>
    navigator.clipboard.writeText(usage).then(
      () => setCopied(true),
      () => {},
    );

  const shellVars: CustomProperties = {
    "--cover-header-height": headerOn ? `${headerHeight}px` : "0px",
  };

  return (
    <Shell style={shellVars}>
      <TuningStyle $declarations={declarations} />
      {headerOn && <AppHeader>App header</AppHeader>}

      <Cover
        imageUrl={imageUrl}
        imageFocus={focus}
        imageFocusMobile={focusMobile ?? undefined}
        imageZoomMobile={zoomMobile}
        imageShiftUpMobile={`${shiftUpMobile}rem`}
        imageAspectRatio={aspectRatio ?? undefined}
        title={title}
        titlePosition={titlePosition}
      >
        <Card>
          <Heading>cover-overlay demo</Heading>
          <Lead>
            This page is a <Mono>&lt;CoverOverlay&gt;</Mono>, and these cards are its children. Resize
            across {COVER_BREAKPOINT}px, or open it on a phone, to see the mobile band and the two desktop
            layouts. Upload your own photo below to find its focus point.
          </Lead>
          <div>
            Layout now:{" "}
            {isDesktop ? (
              <strong>desktop (≥ {COVER_BREAKPOINT}px)</strong>
            ) : (
              <>
                <strong>mobile (&lt; {COVER_BREAKPOINT}px)</strong>{" "}
                <Muted>— the title always stacks on top here</Muted>
              </>
            )}
          </div>
        </Card>

        <DropCard
          $dropping={dropping}
          onDragOver={(event) => {
            if (!event.dataTransfer.types.includes("Files")) return;
            event.preventDefault();
            setDropping(true);
          }}
          // dragleave also fires when the pointer moves onto a child; only leaving the card counts.
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropping(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDropping(false);
            applyFile(event.dataTransfer.files[0]);
          }}
        >
          <CardTitle>
            Photo
            <Button
              type="button"
              $variant="secondary"
              onClick={resetFraming}
            >
              Reset framing
            </Button>
          </CardTitle>
          <Row>
            <FileButton>
              Upload photo…
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  applyFile(event.target.files?.[0]);
                  // Cleared so that choosing the same file again still fires change.
                  event.target.value = "";
                }}
              />
            </FileButton>
            <Button
              type="button"
              $variant="secondary"
              onClick={applyDesignPhoto}
              disabled={imageUrl === DESIGN_PHOTO}
            >
              Design photo
            </Button>
          </Row>
          <form onSubmit={applyCustomPhoto}>
            <Row>
              <WideField>
                or a URL
                <input
                  type="url"
                  placeholder="https://… (any uncropped photo)"
                  value={draftUrl}
                  onChange={(event) => setDraftUrl(event.target.value)}
                />
              </WideField>
              <Button type="submit" $variant="secondary" disabled={!draftUrl.trim()}>
                Use
              </Button>
            </Row>
          </form>
          <Note>
            You can also drop an image on this card. An uploaded photo stays in this browser tab: nothing
            is sent anywhere.
          </Note>
          <div>
            {photo.failed ? (
              <Muted>
                Could not load this photo
                {uploadName ? " — this browser may not support its format (HEIC, for example)" : ""}.
              </Muted>
            ) : photo.size === null || aspectRatio === null ? (
              <Muted>Loading…</Muted>
            ) : (
              <>
                {uploadName && (
                  <>
                    <Mono>{uploadName}</Mono> ·{" "}
                  </>
                )}
                {photo.size.width} × {photo.size.height} px · imageAspectRatio{" "}
                <Mono>{aspectRatio.toFixed(4)}</Mono>
              </>
            )}
          </div>
          <Row>
            <Field>
              <input
                type="checkbox"
                checked={focusMobile !== null}
                onChange={(event) => {
                  setFocusMobile(event.target.checked ? focus : null);
                  if (!event.target.checked) setEditing("desktop");
                }}
              />
              Separate mobile focus
            </Field>
            {focusMobile && (
              <>
                <Muted>Editing</Muted>
                {(["desktop", "mobile"] as const).map((target) => (
                  <Field key={target}>
                    <input
                      type="radio"
                      name="editing"
                      checked={editing === target}
                      onChange={() => setEditing(target)}
                    />
                    {target === "desktop" ? "Desktop (D)" : "Mobile (M)"}
                  </Field>
                ))}
              </>
            )}
          </Row>
          {focusMobile && editingMobile === isDesktop && (
            <Note>
              The background is showing the {isDesktop ? "desktop" : "mobile"} layout; resize across{" "}
              {COVER_BREAKPOINT}px to see the point you are editing.
            </Note>
          )}
          {!photo.failed && (
            <FocusPicker
              src={imageUrl}
              active={
                editingMobile
                  ? { point: focusMobile, label: "M", name: "Mobile focus" }
                  : { point: focus, label: "D", name: focusMobile ? "Desktop focus" : "Focus" }
              }
              other={
                focusMobile &&
                (editingMobile
                  ? { point: focus, label: "D", name: "Desktop focus" }
                  : { point: focusMobile, label: "M", name: "Mobile focus" })
              }
              onChange={(point) => setActiveFocus(() => point)}
            />
          )}
          <Note>
            Click or drag on the photo to set the focus. Desktop frames the photo around it; on phones,
            the mobile focus lands mid-screen, behind the title.
          </Note>
          <Sliders>
            {(["x", "y"] as const).map((axis) => (
              <PropSlider
                key={axis}
                id={`focus-${axis}`}
                label={axis}
                min={0}
                max={100}
                step={0.1}
                value={activeFocus[axis]}
                format={(value) => `${value}%`}
                onChange={(value) => setActiveFocus((previous) => ({ ...previous, [axis]: value }))}
              />
            ))}
            <GroupLabel>Mobile framing</GroupLabel>
            <PropSlider
              id="zoom-mobile"
              label="imageZoomMobile"
              min={1}
              max={4}
              step={0.05}
              value={zoomMobile}
              changed={zoomMobile !== DEFAULT_ZOOM_MOBILE}
              format={(value) => `${value}`}
              onChange={setZoomMobile}
            />
            <PropSlider
              id="shift-up-mobile"
              label="imageShiftUpMobile"
              min={-6}
              max={6}
              step={0.25}
              value={shiftUpMobile}
              changed={shiftUpMobile !== DEFAULT_SHIFT_UP_REM}
              format={(value) => `${value}rem`}
              onChange={setShiftUpMobile}
            />
          </Sliders>
        </DropCard>

        <Card>
          <CardTitle>Props</CardTitle>
          <Row>
            <Muted>titlePosition</Muted>
            {[OVERLAY_TYPE.TITLE_SIDE, OVERLAY_TYPE.TITLE_TOP].map((position) => (
              <Field key={position}>
                <input
                  type="radio"
                  name="titlePosition"
                  checked={titlePosition === position}
                  onChange={() => setTitlePosition(position)}
                />
                {position === OVERLAY_TYPE.TITLE_SIDE ? "TITLE_SIDE" : "TITLE_TOP"}
              </Field>
            ))}
          </Row>
          {!isDesktop && <Note>titlePosition only changes the desktop layout.</Note>}
          <Row>
            <WideField>
              title
              <input type="text" value={title} onChange={(event) => setTitle(event.target.value)} />
            </WideField>
          </Row>
        </Card>

        <Card>
          <CardTitle>
            Tuning
            <Button
              type="button"
              $variant="secondary"
              onClick={() => setOverrides({})}
              disabled={changedKnobs.length === 0}
            >
              Reset all
            </Button>
          </CardTitle>
          <Note>
            The custom properties the background is framed with, starting from the component's own
            values. Changed ones are highlighted.
          </Note>
          <Sliders>
            {KNOB_GROUPS.map((group) => (
              <KnobGroup
                key={group.label}
                label={group.label}
                knobs={group.knobs}
                defaults={knobDefaults}
                overrides={overrides}
                onChange={setKnob}
              />
            ))}
          </Sliders>
        </Card>

        <Card>
          <CardTitle>Page</CardTitle>
          <Row>
            <Field>
              <input type="checkbox" checked={headerOn} onChange={(event) => setHeaderOn(event.target.checked)} />
              App header
            </Field>
            <Field>
              --cover-header-height
              <input
                type="number"
                min={0}
                max={160}
                value={headerHeight}
                disabled={!headerOn}
                onChange={(event) => setHeaderHeight(Number(event.target.value))}
              />
              px
            </Field>
          </Row>
          <Row>
            <Field>
              Extra cards
              <input
                type="number"
                min={0}
                max={12}
                value={fillerCards}
                onChange={(event) => setFillerCards(Math.max(0, Number(event.target.value)))}
              />
            </Field>
          </Row>
          <Note>The mobile photo band starts under the header. Extra cards make the page scroll over the fixed background.</Note>
        </Card>

        <Card>
          <CardTitle>
            Usage
            {/* The clipboard API exists only in a secure context, which a phone on http://<LAN IP> isn't. */}
            {window.isSecureContext && (
              <Button type="button" $variant="secondary" onClick={copyUsage}>
                {copied ? "Copied" : "Copy"}
              </Button>
            )}
          </CardTitle>
          <Code>{usage}</Code>
          {declarations && (
            <>
              <Note>Changed tuning values — the defaults on the background layer in cover-background.tsx:</Note>
              <Code>{declarations}</Code>
            </>
          )}
        </Card>

        {Array.from({ length: fillerCards }, (_, index) => (
          <Card key={index}>
            <CardTitle>Sample card {index + 1}</CardTitle>
            <Muted>Filler content, standing in for whatever the host page stacks here.</Muted>
          </Card>
        ))}
      </Cover>
    </Shell>
  );
};

const PropSlider = ({
  id,
  label,
  min,
  max,
  step,
  value,
  changed = false,
  format,
  onChange,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  changed?: boolean;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) => (
  <>
    <KnobLabel htmlFor={id} $changed={changed}>
      {label}
    </KnobLabel>
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    />
    <output htmlFor={id}>{format(value)}</output>
  </>
);

const KnobGroup = ({
  label,
  knobs,
  defaults,
  overrides,
  onChange,
}: {
  label: string;
  knobs: Knob[];
  defaults: Record<string, number>;
  overrides: Record<string, number>;
  onChange: (name: string, value: number) => void;
}) => (
  <>
    <GroupLabel>{label}</GroupLabel>
    {knobs.map((knob) => {
      const value = overrides[knob.name] ?? defaults[knob.name];
      return (
        <KnobRow
          key={knob.name}
          knob={knob}
          value={value}
          changed={overrides[knob.name] !== undefined}
          onChange={(next) => onChange(knob.name, next)}
        />
      );
    })}
  </>
);

const KnobRow = ({
  knob,
  value,
  changed,
  onChange,
}: {
  knob: Knob;
  value: number | undefined;
  changed: boolean;
  onChange: (value: number) => void;
}) => {
  const id = `knob${knob.name}`;
  return (
    <>
      <KnobLabel htmlFor={id} $changed={changed}>
        {knob.name}
      </KnobLabel>
      <input
        id={id}
        type="range"
        min={knob.min}
        max={knob.max}
        step={knob.step}
        value={value ?? knob.min}
        // No readable default means the component no longer declares this as a plain value.
        disabled={value === undefined}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output htmlFor={id}>{value === undefined ? "—" : formatKnob(value, knob.unit)}</output>
    </>
  );
};

export default App;
