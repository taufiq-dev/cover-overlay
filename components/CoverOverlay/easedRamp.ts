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
