import {
  WORK_STATUSES,
  WORK_STATUS_COLOR,
  WORK_STATUS_LABELS,
  type WorkStatus,
} from "@/lib/content/constants";

/** This month's items by status, as one bar, optionally with a legend. */
export function StatusBar({
  byStatus,
  total,
  height = 8,
  legend = false,
}: {
  byStatus: Record<WorkStatus, number>;
  total: number;
  height?: number;
  legend?: boolean;
}) {
  return (
    <>
      <div
        className="bar"
        style={{ height }}
        role="img"
        aria-label={
          WORK_STATUSES.filter((s) => byStatus[s])
            .map((s) => `${WORK_STATUS_LABELS[s]} ${byStatus[s]}`)
            .join(", ") || "Nothing yet"
        }
      >
        {WORK_STATUSES.map((s) =>
          byStatus[s] ? (
            <i
              key={s}
              style={{
                width: `${(byStatus[s] / total) * 100}%`,
                background: WORK_STATUS_COLOR[s],
              }}
              title={`${WORK_STATUS_LABELS[s]}: ${byStatus[s]}`}
            />
          ) : null,
        )}
      </div>
      {legend ? (
        <div className="legend">
          {WORK_STATUSES.map((s) => (
            <span key={s}>
              <i style={{ background: WORK_STATUS_COLOR[s] }} />
              {WORK_STATUS_LABELS[s]} {byStatus[s]}
            </span>
          ))}
        </div>
      ) : null}
    </>
  );
}
