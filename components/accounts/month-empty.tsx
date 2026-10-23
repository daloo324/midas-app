import { monthLabel } from "@/lib/content/constants";
import { StartMonthButton } from "./month-controls";

export function MonthEmpty({
  clientId,
  month,
}: {
  clientId: string;
  month: string;
}) {
  return (
    <div className="empty-state">
      <h2>{monthLabel(month)} isn&apos;t planned yet</h2>
      <p>
        Starting the month creates 26 calendar slots (20 posts, 4 stories, 2
        reels) spread across the month, with pillars set from this client&apos;s
        content mix. You can change every date, pillar and topic afterwards.
      </p>
      <StartMonthButton clientId={clientId} month={month} />
    </div>
  );
}
