import type { Metadata } from "next";
import Link from "next/link";
import { BoardCard, SuggestButton } from "@/components/creative/board-card";
import { StudioHeader } from "@/components/creative/client-header";
import { requireArea } from "@/lib/auth/session";
import { monthLabel, monthParam } from "@/lib/content/constants";
import { KIT_TOTAL } from "@/lib/creative/constants";
import { resolveMonth, studioClientOr404 } from "@/lib/creative/page";
import { pickWeek, weeksOfMonth } from "@/lib/creative/weeks";
import {
  getBoardMonth,
  getRunningTimer,
  minutesSince,
} from "@/lib/data/creative";
import { WORK_STATUS_LABELS } from "@/lib/content/constants";
import { todayInGaborone } from "@/lib/format";

export const metadata: Metadata = { title: "Weekly board" };

const DONE = new Set(["approved", "scheduled", "published"]);
const short = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
const long = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));

export default async function BoardPage({
  params,
  searchParams,
}: PageProps<"/creative/clients/[id]/board">) {
  const user = await requireArea("creative");
  const { id } = await params;
  const sp = await searchParams;
  const client = await studioClientOr404(id);
  const month = resolveMonth(sp.month);

  if (client.kit.status !== "approved") {
    return (
      <>
        <StudioHeader client={client} tab="board" month={month} />
        <div className="locked">
          <h2>Content creation opens after brand kit sign-off</h2>
          <p>
            Every post is built on the brand kit, so the client signs it off
            first. Brand kit status:{" "}
            <b>{WORK_STATUS_LABELS[client.kit.status]}</b>, {client.kit.ready}{" "}
            of {KIT_TOTAL} required items ready.
          </p>
          <Link className="btn pri" href={`/creative/clients/${id}/kit`}>
            Open brand kit
          </Link>
        </div>
      </>
    );
  }

  const [board, running] = await Promise.all([
    getBoardMonth(id, month),
    getRunningTimer(),
  ]);
  if (!board) {
    return (
      <>
        <StudioHeader client={client} tab="board" month={month} />
        <div className="empty-state">
          <h2>No calendar for {monthLabel(month)}</h2>
          <p>
            The account exec plans the month in the Account Desk. Design starts
            once the client approves the calendar.
          </p>
        </div>
      </>
    );
  }

  const locked = board.plan_status !== "approved";
  const weeks = weeksOfMonth(month);
  const index = pickWeek(
    weeks,
    typeof sp.week === "string" ? sp.week : undefined,
    todayInGaborone(),
  );
  const undated = board.items.filter((i) => !i.scheduled_date);
  const showUndated = sp.week === "none" && undated.length > 0;
  const wk = weeks[index];
  const inWeek = showUndated
    ? undated
    : board.items.filter(
        (i) =>
          i.scheduled_date &&
          i.scheduled_date >= wk.start &&
          i.scheduled_date <= wk.end,
      );
  const runningItem = running?.item_id
    ? board.items.find((i) => i.id === running.item_id)
    : null;
  const cards = inWeek.map((i) =>
    runningItem?.id === i.id
      ? {
          ...i,
          minutes: Math.max(0, i.minutes - minutesSince(running!.started_at)),
        }
      : i,
  );
  const needSuggestions = inWeek.filter((i) =>
    [i.visual, i.graphic_copy, i.caption, i.hashtags].some(
      (v) => !v || !v.trim(),
    ),
  );
  const q = (w: string | number) => `?month=${monthParam(month)}&week=${w}`;

  return (
    <>
      <StudioHeader client={client} tab="board" month={month} />
      {locked ? (
        <div className="notice" style={{ marginBottom: 14 }}>
          <b style={{ color: "var(--ink)" }}>Waiting for client approval.</b>{" "}
          The client hasn&apos;t approved the {monthLabel(month)} calendar yet,
          so this month is read-only.
        </div>
      ) : null}
      <nav className="weeks" aria-label="Weeks">
        {weeks.map((w) => {
          const items = board.items.filter(
            (i) =>
              i.scheduled_date &&
              i.scheduled_date >= w.start &&
              i.scheduled_date <= w.end,
          );
          const done = items.filter((i) => DONE.has(i.status)).length;
          return (
            <Link
              key={w.index}
              className="wk"
              href={q(w.index)}
              aria-current={
                !showUndated && w.index === index ? "page" : undefined
              }
            >
              <b>Week {w.index + 1}</b>
              <span>
                {short(w.start)} – {short(w.end)} · {done}/{items.length}
              </span>
              <div className="mini">
                <i
                  style={{
                    width: `${items.length ? (done / items.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </Link>
          );
        })}
        {undated.length ? (
          <Link
            className="wk"
            href={q("none")}
            aria-current={showUndated ? "page" : undefined}
          >
            <b>No date</b>
            <span>
              Unscheduled · {undated.filter((i) => DONE.has(i.status)).length}/
              {undated.length}
            </span>
          </Link>
        ) : null}
      </nav>
      <div className="row between" style={{ marginBottom: 12 }}>
        <div>
          <h2>
            {showUndated
              ? "Unscheduled"
              : `Week ${index + 1} · ${long(wk.start)} – ${long(wk.end)}`}
          </h2>
          <p className="sub">
            {inWeek.length} deliverables. Suggestions only fill empty fields;
            clear a field to get a new one.
          </p>
        </div>
        {!locked ? (
          <SuggestButton
            clientId={id}
            itemIds={needSuggestions.map((i) => i.id)}
            label={`Suggest visuals & copy for this week${needSuggestions.length ? ` (${needSuggestions.length})` : ""}`}
          />
        ) : null}
      </div>
      {cards.length === 0 ? (
        <div className="notice">Nothing scheduled this week.</div>
      ) : (
        cards.map((i) => (
          <BoardCard
            key={i.id}
            item={i}
            clientId={id}
            month={month}
            role={user.role}
            locked={locked}
            running={
              runningItem?.id === i.id
                ? { started_at: running!.started_at }
                : null
            }
          />
        ))
      )}
    </>
  );
}
