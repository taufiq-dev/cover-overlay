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
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FormEvent,
  type PointerEvent,
} from "react";
import { OVERLAY_TYPE, type FocusPoint, type OverlayType } from "@cover-overlay";
import { COVER_BREAKPOINT, DEFAULT_FOCUS, desktopQuery } from "@cover-overlay/constants";
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

/** The design photo (Unsplash Sq8rpq2KB7U), served from public/. DEFAULT_FOCUS is its subject. */
const DESIGN_PHOTO = "/cover.webp";
const CENTRE: FocusPoint = { x: 50, y: 50 };
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
      { name: "--cover-mobile-zoom", unit: "", min: 1, max: 4, step: 0.05 },
      { name: "--cover-mobile-subject-left", unit: "%", min: 0, max: 100, step: 1 },
      { name: "--cover-mobile-shift-up", unit: "rem", min: -6, max: 6, step: 0.25 },
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

const FocusPicker = ({
  src,
  focus,
  onChange,
}: {
  src: string;
  focus: FocusPoint;
  onChange: (focus: FocusPoint) => void;
}) => {
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    onChange({
      x: toPercent(event.clientX - box.left, box.width),
      y: toPercent(event.clientY - box.top, box.height),
    });
  };

  return (
    <Picker
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        move(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) move(event);
      }}
    >
      <img src={src} alt="" draggable={false} />
      <FocusDot style={{ left: `${focus.x}%`, top: `${focus.y}%` }} />
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
  };

  // The file never leaves the tab: an object URL points at it in memory, and nothing is uploaded.
  const applyFile = (file: File | undefined) => {
    if (!file) return;
    setImageUrl(URL.createObjectURL(file));
    setUploadName(file.name);
    setFocus(CENTRE);
  };

  const applyDesignPhoto = () => {
    setImageUrl(DESIGN_PHOTO);
    setUploadName(null);
    setFocus(DEFAULT_FOCUS);
  };

  const usage = [
    "<CoverOverlay",
    uploadName ? `  imageUrl={photoUrl} // ${uploadName}` : `  imageUrl=${JSON.stringify(imageUrl)}`,
    `  imageFocus={{ x: ${focus.x}, y: ${focus.y} }}`,
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
              onClick={() => setFocus(imageUrl === DESIGN_PHOTO ? DEFAULT_FOCUS : CENTRE)}
            >
              Reset focus
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
          {!photo.failed && <FocusPicker src={imageUrl} focus={focus} onChange={setFocus} />}
          <Note>Click or drag on the photo to mark the subject. The background frames it from that point.</Note>
          <Sliders>
            {(["x", "y"] as const).map((axis) => (
              <FocusSlider
                key={axis}
                axis={axis}
                value={focus[axis]}
                onChange={(value) => setFocus((previous) => ({ ...previous, [axis]: value }))}
              />
            ))}
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

const FocusSlider = ({
  axis,
  value,
  onChange,
}: {
  axis: "x" | "y";
  value: number;
  onChange: (value: number) => void;
}) => {
  const id = `focus-${axis}`;
  return (
    <>
      <KnobLabel htmlFor={id} $changed={false}>
        {axis}
      </KnobLabel>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={0.1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output htmlFor={id}>{value}%</output>
    </>
  );
};

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
