// Accounts reached each month, drawn to scale (client-portal.html, lineChart).
// The first point is the pre-Midas baseline when there is one.

function niceMax(v: number) {
  if (v <= 0) return 1000;
  const step = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * step >= v) return m * step;
  return 10 * step;
}

export function ReachChart({
  points,
}: {
  points: { label: string; value: number }[];
}) {
  const W = 560,
    H = 220,
    l = 56,
    r = 20,
    t = 24,
    b = 36;
  const max = niceMax(Math.max(...points.map((p) => p.value)) * 1.05);
  const tickStep = max / 4;
  const n = points.length;
  const X = (i: number) =>
    n === 1 ? (l + W - r) / 2 : l + (i * (W - l - r)) / (n - 1);
  const Y = (v: number) => t + (1 - v / max) * (H - t - b);
  const pts = points.map((p, i) => `${X(i)},${Y(p.value)}`).join(" ");
  const anchor = (i: number) =>
    n === 1 ? "middle" : i === 0 ? "start" : i === n - 1 ? "end" : "middle";
  const first = points[0];
  const last = points[n - 1];
  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={
        n > 1
          ? `Accounts reached went from ${first.value.toLocaleString("en-GB")} (${first.label}) to ${last.value.toLocaleString("en-GB")} (${last.label})`
          : `Accounts reached: ${last.value.toLocaleString("en-GB")}`
      }
    >
      {[0, 1, 2, 3, 4].map((k) => {
        const v = k * tickStep;
        return (
          <g key={k}>
            <line x1={l} x2={W - r} y1={Y(v)} y2={Y(v)} stroke="var(--line)" />
            <text
              x={l - 8}
              y={Y(v) + 4}
              textAnchor="end"
              fontSize="11"
              fill="var(--muted)"
            >
              {v >= 1000
                ? `${(v / 1000).toLocaleString("en-GB", { maximumFractionDigits: 1 })}k`
                : Math.round(v)}
            </text>
          </g>
        );
      })}
      {n > 1 ? (
        <polygon
          points={`${X(0)},${Y(0)} ${pts} ${X(n - 1)},${Y(0)}`}
          fill="var(--gold)"
          fillOpacity="0.15"
        />
      ) : null}
      {n > 1 ? (
        <polyline
          points={pts}
          fill="none"
          stroke="var(--gold)"
          strokeWidth="2.5"
        />
      ) : null}
      {points.map((p, i) => (
        <g key={i}>
          <circle
            cx={X(i)}
            cy={Y(p.value)}
            r={i === n - 1 ? 5.5 : 4}
            fill={i === n - 1 ? "var(--gold)" : "var(--surface)"}
            stroke="var(--gold)"
            strokeWidth="2"
          />
          <text
            x={X(i)}
            y={Y(p.value) - 12}
            textAnchor={anchor(i)}
            fontSize="12"
            fontWeight="700"
            fill="var(--ink)"
          >
            {p.value.toLocaleString("en-GB")}
          </text>
          <text
            x={X(i)}
            y={H - 12}
            textAnchor={anchor(i)}
            fontSize="12"
            fill="var(--muted)"
          >
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
