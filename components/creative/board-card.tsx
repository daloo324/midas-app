"use client";

import { useState, useTransition } from "react";
import {
  addCommentAction,
  itemStatusAction,
  registerContentFileAction,
  saveDesignFieldAction,
  suggestAction,
} from "@/app/creative/actions";
import { AutoText } from "@/components/shared/auto-field";
import { useReport, useToast } from "@/components/shared/toast";
import { cx } from "@/lib/cx";
import {
  ITEM_PLATFORM_LABELS,
  PILLAR_LABELS,
  WORK_STATUS_LABELS,
  WORK_STATUS_PILL,
  dayLabel,
  type ItemPlatform,
} from "@/lib/content/constants";
import { movesFor } from "@/lib/creative/moves";
import type { BoardItem } from "@/lib/data/creative";
import { createClient } from "@/lib/supabase/browser";
import { TimerButton } from "./timer";

const FORMAT: Record<string, string> = {
  post: "Post",
  story: "Story",
  reel: "Reel",
  ad_feed: "Feed ad · 4:5",
  ad_story: "Story ad · 9:16",
  ad_variant: "Test variant",
};
const MAX = 50 * 1024 * 1024;

function words(s: string | null) {
  return (s ?? "").trim().split(/\s+/).filter(Boolean).length;
}

/**
 * One deliverable on the weekly board (design-studio.html, itemHTML).
 * item.minutes excludes a running timer (the page subtracts it).
 */
export function BoardCard({
  item: i,
  clientId,
  month,
  role,
  locked,
  running,
}: {
  item: BoardItem;
  clientId: string;
  month: string;
  role: string;
  locked: boolean;
  running: { started_at: string } | null;
}) {
  const [pending, start] = useTransition();
  const [noting, setNoting] = useState(false);
  const [note, setNote] = useState("");
  const [copy, setCopy] = useState(i.graphic_copy ?? "");
  const report = useReport();
  const moves = locked ? [] : movesFor(i.status, role);
  const feedback = [...i.comments]
    .reverse()
    .find((c) => c.author_kind === "client");
  const save =
    (field: "visual" | "graphic_copy" | "caption" | "hashtags") =>
    (value: string) =>
      saveDesignFieldAction({ itemId: i.id, field, value });
  const mark = (field: string) =>
    i.suggested_fields.includes(field) ? (
      <span className="suggested">Suggested by Claude, edit before use</span>
    ) : null;
  const move = (status: string, comment?: string) =>
    start(async () => {
      if (
        report(await itemStatusAction(i.id, { status, comment: comment ?? "" }))
      )
        setNoting(false);
    });
  const n = words(copy);

  return (
    <article
      className={cx("item", running && "running", locked && "locked-item")}
      id={i.id}
    >
      <header>
        <span className="id">{i.slot_code}</span>
        <span className="pill">{FORMAT[i.format] ?? i.format}</span>
        <span className="date">
          {i.scheduled_date ? dayLabel(i.scheduled_date) : "No date"}
        </span>
        <span className="pill s-gold">
          {PILLAR_LABELS[i.pillar as keyof typeof PILLAR_LABELS] ?? i.pillar}
        </span>
        <span className="pill">
          {ITEM_PLATFORM_LABELS[i.platform as ItemPlatform] ?? i.platform}
        </span>
        <span className="sp" />
        <span className={`pill ${WORK_STATUS_PILL[i.status]}`}>
          {WORK_STATUS_LABELS[i.status]}
        </span>
        {moves.map((m) =>
          m.needsNote ? (
            <button
              key={m.to}
              className="btn sm"
              type="button"
              disabled={pending}
              onClick={() => setNoting(true)}
            >
              {m.label}
            </button>
          ) : (
            <button
              key={m.to}
              className={m.to === "client_review" ? "btn sm pri" : "btn sm"}
              type="button"
              disabled={pending}
              onClick={() => move(m.to)}
            >
              {m.label}
            </button>
          ),
        )}
        {!locked ? (
          <TimerButton
            itemId={i.id}
            loggedMinutes={i.minutes}
            runningSince={running?.started_at ?? null}
          />
        ) : null}
      </header>

      {noting ? (
        <form
          className="row"
          style={{ padding: "10px 14px 0" }}
          onSubmit={(e) => {
            e.preventDefault();
            move("changes_requested", note);
          }}
        >
          <input
            className="field"
            style={{ flex: 1 }}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What should change?"
            aria-label={`${i.slot_code}: what should change?`}
            required
          />
          <button
            className="btn sm pri"
            type="submit"
            disabled={pending || !note.trim()}
          >
            Ask for changes
          </button>
          <button
            className="btn sm"
            type="button"
            onClick={() => setNoting(false)}
          >
            Cancel
          </button>
        </form>
      ) : null}

      {i.status === "changes_requested" && feedback ? (
        <div className="feedback" role="note">
          <b>
            The client asked for changes
            {i.revision_rounds >= 2
              ? " (second round: extra revisions may be billable)"
              : ""}
            :
          </b>{" "}
          {feedback.body}
        </div>
      ) : null}

      <div className="topic">
        <span>Topic from the calendar:</span>{" "}
        <b>{i.topic || "No topic given"}</b>
      </div>
      {i.notes ? <div className="aenotes">{i.notes}</div> : null}

      <div className="cols">
        <label className="f">
          <span className="row between">Suggested visual {mark("visual")}</span>
          <AutoText
            multiline
            rows={4}
            value={i.visual}
            disabled={locked}
            placeholder="Image, layout, colours from the brand kit"
            onSave={save("visual")}
            aria-label={`${i.slot_code} suggested visual`}
          />
        </label>
        <label className="f">
          <span className="row between">
            Copy on the design {mark("graphic_copy")}
            <span className={cx("count", n > 8 && "over")}>
              {n} word{n === 1 ? "" : "s"}
              {n > 8 ? " · aim for 8 or fewer" : ""}
            </span>
          </span>
          <AutoText
            multiline
            rows={4}
            value={i.graphic_copy}
            disabled={locked}
            placeholder="Headline or text on the graphic (8 words or fewer)"
            onSave={async (v) => {
              const r = await save("graphic_copy")(v);
              if (!r.error) setCopy(v);
              return r;
            }}
            aria-label={`${i.slot_code} copy on the design`}
          />
        </label>
        <label className="f">
          <span className="row between">Caption {mark("caption")}</span>
          <AutoText
            multiline
            rows={4}
            value={i.caption}
            disabled={locked}
            placeholder="Copy that goes with the post, with a call to action"
            onSave={save("caption")}
            aria-label={`${i.slot_code} caption`}
          />
        </label>
      </div>

      <div className="foot">
        <label className="f" style={{ flex: 1, minWidth: 180 }}>
          <span className="row between">Hashtags {mark("hashtags")}</span>
          <AutoText
            type="text"
            value={i.hashtags}
            disabled={locked}
            onSave={save("hashtags")}
            aria-label={`${i.slot_code} hashtags`}
          />
        </label>
        <FileField
          label="Final file"
          kind="final"
          item={i}
          clientId={clientId}
          month={month}
          url={i.finalUrl}
          path={i.final_file_path}
          disabled={locked}
        />
        <FileField
          label="Client preview image"
          kind="preview"
          item={i}
          clientId={clientId}
          month={month}
          url={i.previewUrl}
          path={i.preview_path}
          disabled={locked}
          accept="image/*"
        />
        {!locked ? (
          <SuggestButton
            clientId={clientId}
            itemIds={[i.id]}
            label="Suggest"
            className="btn sm"
          />
        ) : null}
      </div>

      <Comments item={i} role={role} />
    </article>
  );
}

function FileField({
  label,
  kind,
  item,
  clientId,
  month,
  url,
  path,
  disabled,
  accept,
}: {
  label: string;
  kind: "final" | "preview";
  item: BoardItem;
  clientId: string;
  month: string;
  url: string | null;
  path: string | null;
  disabled: boolean;
  accept?: string;
}) {
  const [busy, setBusy] = useState(false);
  const say = useToast();
  const upload = async (file: File) => {
    if (file.size > MAX) return say(`${file.name} is over 50 MB.`, "err");
    if (kind === "preview" && !file.type.startsWith("image/"))
      return say("The client preview must be an image.", "err");
    setBusy(true);
    try {
      const safe = file.name.replace(/[^A-Za-z0-9._-]+/g, "-").slice(-80);
      const p = `${clientId}/${month.slice(0, 7)}/${item.slot_code}/${kind}-${crypto.randomUUID().slice(0, 8)}-${safe}`;
      const { error } = await createClient()
        .storage.from("content")
        .upload(p, file, {
          contentType: file.type || undefined,
          upsert: false,
        });
      if (error) return say(`${file.name} didn't upload. Try again.`, "err");
      const r = await registerContentFileAction({
        itemId: item.id,
        kind,
        path: p,
      });
      say(r.error ?? r.ok ?? "Saved.", r.error ? "err" : "ok");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div
      className="f"
      style={{
        display: "grid",
        gap: 4,
        fontSize: 12.5,
        fontWeight: 600,
        color: "var(--muted)",
        minWidth: 170,
      }}
    >
      {label}
      <div className="row" style={{ gap: 6 }}>
        {path && url ? (
          <a
            className="btn sm"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {path
              .split("/")
              .pop()!
              .replace(/^(final|preview)-[0-9a-f]{8}-/, "")}
          </a>
        ) : (
          <span style={{ fontWeight: 500 }}>None yet</span>
        )}
        {!disabled ? (
          <label className="btn sm">
            {busy ? "Uploading…" : path ? "Replace" : "Upload"}
            <input
              type="file"
              hidden
              accept={accept}
              disabled={busy}
              aria-label={`${item.slot_code} ${label.toLowerCase()}`}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void upload(f);
              }}
            />
          </label>
        ) : null}
      </div>
    </div>
  );
}

function Comments({ item, role }: { item: BoardItem; role: string }) {
  const [body, setBody] = useState("");
  const [toClient, setToClient] = useState(false);
  const [pending, start] = useTransition();
  const report = useReport();
  const canReplyToClient = ["ceo", "creative_director"].includes(role);
  return (
    <div className="thread">
      {item.comments.map((c) => (
        <div
          key={c.id}
          className={cx(
            "c",
            c.author_kind === "client" && "client",
            c.author_kind !== "client" && c.visible_to_client && "public",
          )}
        >
          <b>{c.author ?? "Someone"}</b>
          {c.visible_to_client && c.author_kind !== "client"
            ? " (visible to client)"
            : ""}
          : {c.body}
        </div>
      ))}
      <form
        className="row"
        style={{ gap: 6 }}
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            if (
              report(
                await addCommentAction({
                  itemId: item.id,
                  body,
                  visibleToClient: toClient,
                }),
              )
            ) {
              setBody("");
              setToClient(false);
            }
          });
        }}
      >
        <input
          className="field"
          style={{ flex: 1, minWidth: 200 }}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment"
          aria-label={`${item.slot_code} comment`}
        />
        {canReplyToClient ? (
          <label
            className="row"
            style={{ gap: 4, fontSize: 12.5, flexWrap: "nowrap" }}
          >
            <input
              type="checkbox"
              checked={toClient}
              onChange={(e) => setToClient(e.target.checked)}
            />{" "}
            Visible to client
          </label>
        ) : null}
        <button
          className="btn sm"
          type="submit"
          disabled={pending || !body.trim()}
        >
          Comment
        </button>
      </form>
    </div>
  );
}

export function SuggestButton({
  clientId,
  itemIds,
  label,
  className = "btn gold",
  disabled,
}: {
  clientId: string;
  itemIds: string[];
  label: string;
  className?: string;
  disabled?: boolean;
}) {
  const [pending, start] = useTransition();
  const report = useReport();
  return (
    <button
      className={className}
      type="button"
      disabled={pending || disabled || !itemIds.length}
      onClick={() =>
        start(async () => void report(await suggestAction(clientId, itemIds)))
      }
    >
      {pending ? "Writing suggestions…" : label}
    </button>
  );
}
