/** Eased alpha ramp ("scrim gradient"). [position %, alpha] */
const EASED_STOPS: ReadonlyArray<readonly [number, number]> = [
  [0, 0], [8, 0.013], [15, 0.049], [22, 0.104], [29, 0.175], [35, 0.259],
  [41, 0.352], [47, 0.45], [53, 0.55], [59, 0.648], [65, 0.741], [71, 0.825],
  [78, 0.896], [85, 0.951], [92, 0.987], [100, 1],
];

type RampOptions = {
  direction: string;
  /** Space-separated RGB channels, e.g. "0 0 0". */
  rgb?: string;
  /** Peak alpha at the end of the ramp. */
  max?: number;
  /** Length the ramp covers; anything after it holds the final stop. */
  span?: string;
  /** Where the ramp starts; anything before it holds the first stop. */
  offset?: string;
};

/**
 * A perceptually smooth gradient (alpha 0 → max along `direction`). A plain 2-stop
 * linear-gradient looks banded and leaves a visible hard line where it ends.
 * As a mask-image, alpha is visibility: 0 = hidden, 1 = fully shown.
 */
export const easedRamp = ({
  direction,
  rgb = "0 0 0",
  max = 1,
  span = "100%",
  offset = "0px",
}: RampOptions): string =>
  `linear-gradient(${direction}, ${EASED_STOPS.map(
    ([pos, alpha]) =>
      `rgb(${rgb} / ${+(alpha * max).toFixed(3)}) calc(${offset} + ${span} * ${pos / 100})`,
  ).join(", ")})`;

/** The eased ramp's alpha at `t` (0 → 1 along it), interpolated between its stops. */
export const easedAlpha = (t: number): number => {
  const position = Math.min(1, Math.max(0, t)) * 100;
  let previous: readonly [number, number] = [0, 0];
  for (const stop of EASED_STOPS) {
    const [stopPosition, stopAlpha] = stop;
    if (position <= stopPosition) {
      const [previousPosition, previousAlpha] = previous;
      if (stopPosition === previousPosition) return stopAlpha;
      return previousAlpha + ((position - previousPosition) / (stopPosition - previousPosition)) * (stopAlpha - previousAlpha);
    }
    previous = stop;
  }
  return 1;
};

type SliceOptions = {
  /** Where the slice starts and ends along the whole ramp, 0 → 1. */
  from: number;
  to: number;
  /** Any CSS colour, including a var(): mixed with transparent to get each stop's alpha. */
  color: string;
};

/**
 * One element's slice of an eased ramp that runs top to bottom across several stacked elements:
 * a gradient over just that element, from the ramp's alpha at `from` to its alpha at `to`. It
 * carries the ramp's own stops that fall inside the slice, so the curve keeps its shape, and its
 * end alphas match the neighbouring slices', so stacked slices join without a seam.
 */
export const easedSlice = ({ from, to, color }: SliceOptions): string => {
  const inside = EASED_STOPS.map(([position]) => position / 100).filter((t) => t > from && t < to);
  return `linear-gradient(to bottom, ${[from, ...inside, to]
    .map(
      (t) =>
        `color-mix(in srgb, ${color} ${+(easedAlpha(t) * 100).toFixed(1)}%, transparent) ${+(((t - from) / (to - from)) * 100).toFixed(2)}%`,
    )
    .join(", ")})`;
};
