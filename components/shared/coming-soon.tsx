/** Placeholder for a page planned in a later phase. */
export function ComingSoon({
  title,
  phase,
  children,
}: {
  title: string;
  phase: number;
  children?: React.ReactNode;
}) {
  return (
    <>
      <div className="head">
        <div>
          <h1>{title}</h1>
        </div>
      </div>
      <div className="empty-state">
        <h2>Coming in Phase {phase}</h2>
        <p>
          {children ??
            "This page is planned and will be built in a later phase."}
        </p>
      </div>
    </>
  );
}
