import { focusCaption, hourIsObserved, hourLabel, strongestObservedHour } from "@/lib/you";
import type { FocusProfile, HourFocus } from "@/lib/types";

interface FocusChartProps {
  focus: FocusProfile;
}

// viewBox geometry: 24 slots of 10 units; bars fill the slot minus a 2-unit gap.
const SLOT = 10;
const GAP = 2;
const BAR = SLOT - GAP;
const WIDTH = SLOT * 24;
/** Room either side, so the first and last hour labels ("12 AM", "9 PM") are never clipped. */
const PAD_X = 10;
/** A band above the bars for the strongest-hour label, so it never overlaps a bar. */
const BAND = 12;
const PLOT_TOP = BAND + 3;
const BASELINE = PLOT_TOP + 80;
const PLOT_HEIGHT = BASELINE - PLOT_TOP;
const LABEL_Y = BASELINE + 11;
const HEIGHT = LABEL_Y + 3;
const RADIUS = 1.5;
const LABEL_EVERY = 3;
/** Evidence is solid; an hour with no outcomes is the starting assumption, drawn lighter. */
const OBSERVED_OPACITY = 0.9;
const ASSUMED_OPACITY = 0.3;
const PRIOR_OPACITY = 0.4;
/** Rough width of the strongest-hour label, in viewBox units, to keep it inside the chart. */
const MARK_HALF_WIDTH = 43;

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

function hourTitle(h: HourFocus): string {
  const base = `${hourLabel(h.hour)}: focus ${Math.round(h.score * 100)}%`;
  if (!hourIsObserved(h)) return `${base} (starting assumption — no outcomes yet)`;
  return `${base} — ${h.done} done, ${h.not_done} set aside`;
}

/** The hours where focus is highest, for the prior's description. */
function highestHours(hours: HourFocus[]): string {
  const top = Math.max(...hours.map((h) => h.score));
  return hours
    .filter((h) => h.score === top)
    .map((h) => hourLabel(h.hour))
    .join(", ");
}

const barHeight = (h: HourFocus) => Math.max(0, Math.min(1, h.score)) * PLOT_HEIGHT;

/**
 * Focus by local hour: 24 columns, an accessible title, and a caption that says
 * whether it was learned from outcomes or is the starting guess. On a learned
 * profile the strongest hour (with outcomes behind it) is marked, and hours with
 * no outcomes are drawn lighter: they are the starting assumption, not evidence.
 */
export function FocusChart({ focus }: FocusChartProps) {
  const learned = focus.source === "learned";
  const caption = focusCaption(focus);
  const strongest = strongestObservedHour(focus);
  const someAssumed = learned && focus.hours.some((h) => !hourIsObserved(h));
  const summary = learned
    ? `${strongest ? `Strongest around ${hourLabel(strongest.hour)}. ` : ""}${caption}.`
    : `${caption}. Highest around ${highestHours(focus.hours)}.`;

  // Where the strongest-hour label sits: centred on its bar, kept inside the chart.
  const mark = (() => {
    if (!strongest) return null;
    const cx = strongest.hour * SLOT + SLOT / 2;
    if (cx + MARK_HALF_WIDTH > WIDTH) return { cx, x: cx + SLOT / 2, anchor: "end" as const };
    if (cx - MARK_HALF_WIDTH < 0) return { cx, x: cx - SLOT / 2, anchor: "start" as const };
    return { cx, x: cx, anchor: "middle" as const };
  })();

  return (
    <figure>
      <svg
        viewBox={`${-PAD_X} 0 ${WIDTH + PAD_X * 2} ${HEIGHT}`}
        role="img"
        aria-labelledby="focus-chart-title focus-chart-desc"
        className="block h-auto w-full text-muted"
      >
        <title id="focus-chart-title">Focus by hour of the day</title>
        <desc id="focus-chart-desc">{summary}</desc>

        {focus.hours.map((h) => {
          const x = h.hour * SLOT + GAP / 2;
          const height = barHeight(h);
          const opacity = !learned
            ? PRIOR_OPACITY
            : hourIsObserved(h)
              ? OBSERVED_OPACITY
              : ASSUMED_OPACITY;
          return (
            <g key={h.hour}>
              <title>{hourTitle(h)}</title>
              {height > 0 && (
                <path d={barPath(x, height)} fill="var(--color-dusk)" opacity={opacity} />
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

        {strongest && mark && (
          <g aria-hidden="true">
            {/* A small caret on the bar, a hairline up to the label in the band above every bar */}
            <line
              x1={mark.cx}
              x2={mark.cx}
              y1={BAND - 1}
              y2={BASELINE - barHeight(strongest) - 4.5}
              stroke="var(--color-terra)"
              strokeOpacity={0.5}
              strokeWidth={1}
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={`M${mark.cx - 2.5},${BASELINE - barHeight(strongest) - 4.5} h5 l-2.5,3 z`}
              fill="var(--color-terra)"
            />
            <text
              x={mark.x}
              y={BAND - 3}
              textAnchor={mark.anchor}
              fontSize={6.5}
              fill="var(--text-secondary)"
            >
              {hourLabel(strongest.hour)} — your strongest hour
            </text>
          </g>
        )}

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

      {someAssumed && (
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-2 w-3 rounded-sm"
              style={{ backgroundColor: "var(--color-dusk)", opacity: OBSERVED_OPACITY }}
            />
            From your outcomes
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-2 w-3 rounded-sm"
              style={{ backgroundColor: "var(--color-dusk)", opacity: ASSUMED_OPACITY }}
            />
            Lighter: no outcomes at that hour yet — a starting assumption, not evidence
          </span>
        </p>
      )}
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
