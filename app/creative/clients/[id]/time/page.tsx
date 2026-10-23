import type { Metadata } from "next";
import { StudioHeader } from "@/components/creative/client-header";
import { ManualTime } from "@/components/creative/manual-time";
import { hm } from "@/lib/creative/time-format";
import {
  WORK_STATUS_LABELS,
  WORK_STATUS_PILL,
  dayLabel,
} from "@/lib/content/constants";
import { resolveMonth, studioClientOr404 } from "@/lib/creative/page";
import { clientTime, getBoardMonth } from "@/lib/data/creative";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Time report" };

const KIND: Record<string, string> = {
  post: "post",
  story: "story",
  reel: "reel",
  ad_feed: "ad",
  ad_story: "ad",
  ad_variant: "ad",
};
const FORMAT: Record<string, string> = {
  post: "Post",
  story: "Story",
  reel: "Reel",
  ad_feed: "Feed ad",
  ad_story: "Story ad",
  ad_variant: "Test variant",
};

export default async function ClientTimePage({
  params,
  searchParams,
}: PageProps<"/creative/clients/[id]/time">) {
  const { id } = await params;
  const client = await studioClientOr404(id);
  const month = resolveMonth((await searchParams).month);
  const [rows, board] = await Promise.all([
    clientTime(id, month),
    getBoardMonth(id, month),
  ]);

  const kitMinutes = rows
    .filter((r) => r.is_brand_kit)
    .reduce((a, r) => a + r.minutes, 0);
  const perItem = new Map<string, { minutes: number; manual: number }>();
  for (const r of rows.filter((r) => r.content_item_id)) {
    const cur = perItem.get(r.content_item_id!) ?? { minutes: 0, manual: 0 };
    perItem.set(r.content_item_id!, {
      minutes: cur.minutes + r.minutes,
      manual: cur.manual + r.manual_minutes,
    });
  }
  const items = board?.items ?? [];
  const total = [...perItem.values()].reduce((a, v) => a + v.minutes, 0);
  const hours = total / 60;
  const rate =
    hours > 0 && client.monthly_fee ? client.monthly_fee / hours : null;
  const averages = ["post", "story", "reel", "ad"].map((kind) => {
    const timed = items.filter(
      (i) => KIND[i.format] === kind && (perItem.get(i.id)?.minutes ?? 0) > 0,
    );
    const sum = timed.reduce((a, i) => a + perItem.get(i.id)!.minutes, 0);
    return {
      kind,
      timed: timed.length,
      avg: timed.length ? Math.round(sum / timed.length) : null,
    };
  });

  return (
    <>
      <StudioHeader client={client} tab="time" month={month} />
      <div className="stat">
        <div>
          <b>{hm(total)}</b>
          <span>Time logged this month</span>
        </div>
        <div>
          <b>{hm(kitMinutes)}</b>
          <span>Brand kit, once-off</span>
        </div>
        {averages.map((a) => (
          <div key={a.kind}>
            <b>{a.avg !== null ? hm(a.avg) : "—"}</b>
            <span>
              Average per {a.kind} ({a.timed} timed)
            </span>
          </div>
        ))}
        <div>
          <b>{rate ? formatMoney(Math.round(rate)) : "—"}</b>
          <span>
            Effective rate per hour
            {client.monthly_fee ? ` at ${formatMoney(client.monthly_fee)}` : ""}
          </span>
        </div>
      </div>
      <ManualTime
        clientId={id}
        items={items.map((i) => ({
          id: i.id,
          label: `${i.slot_code}${i.topic ? ` · ${i.topic}` : ""}`,
        }))}
      />
      {items.length === 0 ? (
        <div className="notice">No calendar this month.</div>
      ) : (
        <div
          className="tbl-wrap"
          style={{
            border: "1px solid var(--line)",
            borderRadius: 12,
            background: "var(--surface)",
          }}
        >
          <table className="tbl">
            <thead>
              <tr>
                <th>Slot</th>
                <th>Format</th>
                <th>Date</th>
                <th>Status</th>
                <th className="num">Time</th>
                <th className="num">Of which manual</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const t = perItem.get(i.id);
                return (
                  <tr key={i.id}>
                    <td>
                      <b>{i.slot_code}</b>
                    </td>
                    <td>{FORMAT[i.format] ?? i.format}</td>
                    <td>{dayLabel(i.scheduled_date)}</td>
                    <td>
                      <span className={`pill ${WORK_STATUS_PILL[i.status]}`}>
                        {WORK_STATUS_LABELS[i.status]}
                      </span>
                    </td>
                    <td className="num">{t ? hm(t.minutes) : "—"}</td>
                    <td className="num">{t?.manual ? hm(t.manual) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="sub">
        The effective rate counts design time this month against the monthly
        fee. The brand kit is counted once, separately.
      </p>
    </>
  );
}
