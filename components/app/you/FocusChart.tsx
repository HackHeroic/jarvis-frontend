import { focusCaption, hourLabel } from "@/lib/you";
import type { FocusProfile, HourFocus } from "@/lib/types";

interface FocusChartProps {
  focus: FocusProfile;
}

// viewBox geometry: 24 slots of 10 units; bars fill the slot minus a 2-unit gap.
const SLOT = 10;
const GAP = 2;
const BAR = SLOT - GAP;
const PLOT_TOP = 4;
const BASELINE = 84;
const PLOT_HEIGHT = BASELINE - PLOT_TOP;
const LABEL_Y = BASELINE + 11;
const WIDTH = SLOT * 24;
const HEIGHT = LABEL_Y + 3;
const RADIUS = 1.5;
const LABEL_EVERY = 3;

/** A column with a rounded data-end, square at the baseline. */
function barPath(x: number, height: number): string {
  const y = BASELINE - height;
  const r = Math.min(RADIUS, height / 2, BAR / 2);
  return [
    `M${x},${BASELINE}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `H${x + BAR - r}`,
    `Q${x + BAR},${y} ${x + BAR},${y + r}`,
    `V${BASELINE}`,
    "Z",
  ].join(" ");
}

function hourTitle(h: HourFocus, learned: boolean): string {
  const base = `${hourLabel(h.hour)}: focus ${Math.round(h.score * 100)}%`;
  if (!learned && h.done + h.not_done === 0) return `${base} (starting guess)`;
  return `${base} — ${h.done} done, ${h.not_done} set aside`;
}

/** The hours where focus is strongest, for the chart's description. */
function strongestHours(hours: HourFocus[]): string {
  const top = Math.max(...hours.map((h) => h.score));
  return hours
    .filter((h) => h.score === top)
    .map((h) => hourLabel(h.hour))
    .join(", ");
}

/**
 * Focus by local hour: 24 columns, an accessible title, and a caption that
 * says whether it was learned from outcomes or is the starting guess.
 */
export function FocusChart({ focus }: FocusChartProps) {
  const learned = focus.source === "learned";
  const caption = focusCaption(focus);
  const summary = learned
    ? `Strongest around ${strongestHours(focus.hours)}. ${caption}.`
    : `${caption}. Highest around ${strongestHours(focus.hours)}.`;

  return (
    <figure>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-labelledby="focus-chart-title focus-chart-desc"
        className="block h-auto w-full text-muted"
      >
        <title id="focus-chart-title">Focus by hour of the day</title>
        <desc id="focus-chart-desc">{summary}</desc>

        {focus.hours.map((h) => {
          const x = h.hour * SLOT + GAP / 2;
          const height = Math.max(0, Math.min(1, h.score)) * PLOT_HEIGHT;
          return (
            <g key={h.hour}>
              <title>{hourTitle(h, learned)}</title>
              {height > 0 && (
                <path
                  d={barPath(x, height)}
                  fill="var(--color-dusk)"
                  opacity={learned ? 0.9 : 0.4}
                />
              )}
              {/* The whole slot is the hover target, not just the bar. */}
              <rect
                x={h.hour * SLOT}
                y={PLOT_TOP}
                width={SLOT}
                height={PLOT_HEIGHT}
                fill="transparent"
              />
            </g>
          );
        })}

        <line
          x1={0}
          x2={WIDTH}
          y1={BASELINE + 0.5}
          y2={BASELINE + 0.5}
          stroke="var(--border-default)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />

        {focus.hours
          .filter((h) => h.hour % LABEL_EVERY === 0)
          .map((h) => (
            <text
              key={h.hour}
              x={h.hour * SLOT + SLOT / 2}
              y={LABEL_Y}
              textAnchor="middle"
              fontSize={6.5}
              fill="currentColor"
            >
              {hourLabel(h.hour)}
            </text>
          ))}
      </svg>
      <figcaption className="mt-2 text-xs text-secondary">{caption}</figcaption>

      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-muted hover:text-secondary">
          Hour by hour
        </summary>
        <table className="mt-2 w-full text-left text-xs text-secondary">
          <thead>
            <tr className="text-muted">
              <th className="py-1 font-medium">Hour</th>
              <th className="py-1 font-medium">Focus</th>
              <th className="py-1 font-medium">Done</th>
              <th className="py-1 font-medium">Set aside</th>
            </tr>
          </thead>
          <tbody>
            {focus.hours.map((h) => (
              <tr key={h.hour} className="border-t border-border">
                <td className="py-1">{hourLabel(h.hour)}</td>
                <td className="py-1">{Math.round(h.score * 100)}%</td>
                <td className="py-1">{h.done}</td>
                <td className="py-1">{h.not_done}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
