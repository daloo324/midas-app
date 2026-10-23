"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { startTimerAction, stopTimerAction } from "@/app/creative/actions";
import { useReport } from "@/components/shared/toast";

const FOUR_HOURS = 4 * 60 * 60 * 1000;

export function hms(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function hm(minutes: number) {
  const h = Math.floor(minutes / 60);
  return h ? `${h}h ${String(minutes % 60).padStart(2, "0")}m` : `${minutes}m`;
}

/** Milliseconds since a start time, ticking every second. */
function useElapsed(startedAt: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  return startedAt ? now - Date.parse(startedAt) : 0;
}

/** The prototype's timer pill: time so far, and Start or Stop. loggedMinutes excludes a running timer, which ticks on top. */
export function TimerButton({
  itemId,
  kitClientId,
  loggedMinutes,
  runningSince,
}: {
  itemId?: string;
  kitClientId?: string;
  loggedMinutes: number;
  runningSince: string | null;
}) {
  const elapsed = useElapsed(runningSince);
  const [pending, start] = useTransition();
  const report = useReport();
  return (
    <span className="timer">
      <b>{hms(loggedMinutes * 60_000 + elapsed)}</b>
      <button
        type="button"
        className={runningSince ? "stop" : undefined}
        disabled={pending}
        onClick={() =>
          start(
            async () =>
              void report(
                runningSince
                  ? await stopTimerAction()
                  : await startTimerAction({ itemId, kitClientId }),
                { quiet: true },
              ),
          )
        }
      >
        {runningSince ? "Stop" : "Start"}
      </button>
    </span>
  );
}

/** Under the masthead on every /creative page while you have a timer running. */
export function TimerBar({
  timer,
}: {
  timer: {
    started_at: string;
    last_activity_at: string | null;
    client_name: string;
    label: string;
    link: string;
  } | null;
}) {
  const elapsed = useElapsed(timer?.started_at ?? null);
  const [pending, start] = useTransition();
  const report = useReport();
  if (!timer) return null;
  const stale = elapsed > FOUR_HOURS;
  // Stop at the last time you saved something on it, or 4 hours in.
  const stopAt =
    timer.last_activity_at && timer.last_activity_at > timer.started_at
      ? timer.last_activity_at
      : new Date(Date.parse(timer.started_at) + FOUR_HOURS).toISOString();
  return (
    <div className="runbar" role="status">
      <div className="wrap">
        <span className="dot" aria-hidden />
        <span>
          Timing <b style={{ fontSize: 14 }}>{timer.label}</b> for{" "}
          {timer.client_name}
        </span>
        <b>{hms(elapsed)}</b>
        <button
          className="btn sm danger"
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => void report(await stopTimerAction()))
          }
        >
          Stop
        </button>
        <Link className="link" href={timer.link}>
          Open
        </Link>
        {stale ? (
          <span className="row" style={{ gap: 8 }}>
            <b style={{ fontSize: 14, color: "var(--warn)" }}>
              Still working on this?
            </b>
            <button
              className="btn sm"
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => void report(await stopTimerAction(stopAt)))
              }
            >
              Stop it at{" "}
              {new Intl.DateTimeFormat("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Africa/Gaborone",
              }).format(new Date(stopAt))}
            </button>
          </span>
        ) : null}
      </div>
    </div>
  );
}
