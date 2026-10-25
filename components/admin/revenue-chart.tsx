import { monthLabel } from "@/lib/content/constants";

// Invoiced against collected, last 12 months, drawn to scale.

function niceMax(v: number) {
  if (v <= 0) return 1000;
  const step = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * step >= v) return m * step;
  return 10 * step;
}

const short = (m: string) => monthLabel(m).slice(0, 3);
const k = (v: number) =>
  v >= 1000
    ? `P${(v / 1000).toLocaleString("en-GB", { maximumFractionDigits: 1 })}k`
    : `P${Math.round(v)}`;

export function RevenueChart({
  months,
}: {
  months: { month: string; invoiced: number; collected: number }[];
}) {
  const W = 640,
    H = 240,
    l = 56,
    r = 12,
    t = 16,
    b = 34;
  const max = niceMax(
    Math.max(...months.flatMap((m) => [m.invoiced, m.collected])) * 1.05,
  );
  const slot = (W - l - r) / months.length;
  const bar = Math.min(16, slot / 2 - 3);
  const Y = (v: number) => t + (1 - v / max) * (H - t - b);
  const totalIn = months.reduce((a, m) => a + m.invoiced, 0);
  const totalOut = months.reduce((a, m) => a + m.collected, 0);
  return (
    <figure style={{ margin: 0 }}>
      <svg
        className="chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Last 12 months: ${k(totalIn)} invoiced, ${k(totalOut)} collected`}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const v = (max / 4) * i;
          return (
            <g key={i}>
              <line
                x1={l}
                x2={W - r}
                y1={Y(v)}
                y2={Y(v)}
                stroke="var(--line)"
              />
              <text
                x={l - 8}
                y={Y(v) + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--muted)"
              >
                {k(v)}
              </text>
            </g>
          );
        })}
        {months.map((m, i) => {
          const x = l + i * slot + slot / 2;
          return (
            <g key={m.month}>
              <rect
                x={x - bar - 1}
                y={Y(m.invoiced)}
                width={bar}
                height={Y(0) - Y(m.invoiced)}
                fill="var(--navy-2)"
                rx="2"
              >
                <title>{`${monthLabel(m.month)}: P${m.invoiced.toFixed(2)} invoiced`}</title>
              </rect>
              <rect
                x={x + 1}
                y={Y(m.collected)}
                width={bar}
                height={Y(0) - Y(m.collected)}
                fill="var(--gold)"
                rx="2"
              >
                <title>{`${monthLabel(m.month)}: P${m.collected.toFixed(2)} collected`}</title>
              </rect>
              <text
                x={x}
                y={H - 14}
                textAnchor="middle"
                fontSize="11"
                fill="var(--muted)"
              >
                {short(m.month)}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="row sub" style={{ gap: 14, fontSize: 12.5 }}>
        <span className="row" style={{ gap: 6 }}>
          <i
            style={{
              width: 10,
              height: 10,
              background: "var(--navy-2)",
              borderRadius: 2,
              display: "inline-block",
            }}
          />
          Invoiced
        </span>
        <span className="row" style={{ gap: 6 }}>
          <i
            style={{
              width: 10,
              height: 10,
              background: "var(--gold)",
              borderRadius: 2,
              display: "inline-block",
            }}
          />
          Collected
        </span>
      </figcaption>
    </figure>
  );
}
