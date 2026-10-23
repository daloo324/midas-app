"use client";

import { useState, useTransition } from "react";
import {
  addInspirationAction,
  deleteInspirationAction,
  editInspirationAction,
} from "@/app/creative/actions";
import { useReport, useToast } from "@/components/shared/toast";
import { cx } from "@/lib/cx";
import { INSPIRATION_TAGS } from "@/lib/creative/constants";
import { createClient } from "@/lib/supabase/browser";

type Item = {
  id: string;
  note: string | null;
  tags: string[];
  client_id: string | null;
  uploaded_by: string;
  url: string | null;
};
const MAX = 10 * 1024 * 1024;

export function InspirationBoard({
  items,
  clients,
  me,
  canDeleteAny,
}: {
  items: Item[];
  clients: { id: string; name: string }[];
  me: string;
  canDeleteAny: boolean;
}) {
  const [tag, setTag] = useState("");
  const [client, setClient] = useState("");
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const say = useToast();
  const list = items.filter(
    (x) =>
      (!tag || x.tags.includes(tag)) && (!client || x.client_id === client),
  );

  const upload = async (files: FileList | null) => {
    const images = [...(files ?? [])].filter((f) =>
      f.type.startsWith("image/"),
    );
    if (!images.length)
      return say("Choose JPG, PNG, WebP or GIF images.", "err");
    setBusy(true);
    let added = 0;
    try {
      for (const f of images) {
        if (f.size > MAX) {
          say(`${f.name} is over 10 MB.`, "err");
          continue;
        }
        const path = `${crypto.randomUUID()}/${f.name.replace(/[^A-Za-z0-9._-]+/g, "-").slice(-80)}`;
        const { error } = await createClient()
          .storage.from("inspiration")
          .upload(path, f, { contentType: f.type, upsert: false });
        if (error) {
          say(`${f.name} didn't upload.`, "err");
          continue;
        }
        const r = await addInspirationAction({
          path,
          note: "",
          tags: tag ? [tag] : [],
          clientId: client || null,
        });
        if (r.error) say(r.error, "err");
        else added += 1;
      }
      if (added)
        say(added === 1 ? "Added to the board." : `${added} images added.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="panel">
        <h2>Inspiration board</h2>
        <p className="sub">
          Upload references you find. Tag them so the team can find them while
          designing.
        </p>
        <label
          className={cx("dropzone", over && "over")}
          style={{ marginTop: 12 }}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            void upload(e.dataTransfer.files);
          }}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            aria-label="Upload inspiration images"
            disabled={busy}
            onChange={(e) => {
              void upload(e.target.files);
              e.target.value = "";
            }}
          />
          <b>{busy ? "Uploading…" : "Upload images"}</b>
          <br />
          <span className="sub">JPG, PNG, WebP or GIF, up to 10 MB each</span>
        </label>
      </div>
      <div className="row" style={{ marginTop: 14 }}>
        <div className="chips">
          {["", ...INSPIRATION_TAGS].map((t) => (
            <button
              key={t || "all"}
              type="button"
              className="chip"
              aria-pressed={tag === t}
              onClick={() => setTag(t)}
              style={
                tag === t
                  ? {
                      background: "var(--navy)",
                      borderColor: "var(--navy)",
                      color: "var(--on-navy)",
                    }
                  : undefined
              }
            >
              {t || "All tags"}
            </button>
          ))}
        </div>
        <select
          className="field"
          style={{ width: "auto" }}
          value={client}
          onChange={(e) => setClient(e.target.value)}
          aria-label="Filter by client"
        >
          <option value="">All clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {list.length ? (
        <div className="inspo">
          {list.map((x) => (
            <Card
              key={x.id}
              item={x}
              clients={clients}
              canEdit={x.uploaded_by === me || canDeleteAny}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state" style={{ marginTop: 14 }}>
          <h2>No inspiration yet</h2>
          <p>
            Upload layouts, type treatments and photography you&apos;d like the
            team to learn from.
          </p>
        </div>
      )}
    </>
  );
}

function Card({
  item,
  clients,
  canEdit,
}: {
  item: Item;
  clients: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const [tags, setTags] = useState(item.tags);
  const [note, setNote] = useState(item.note ?? "");
  const [pending, start] = useTransition();
  const report = useReport();
  const edit = (patch: { note?: string; tags?: string[]; clientId?: string }) =>
    start(
      async () =>
        void report(await editInspirationAction({ id: item.id, ...patch }), {
          quiet: true,
        }),
    );
  return (
    <figure className="ins">
      {item.url ? (
        // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
        <img
          src={item.url}
          alt={item.note || "Inspiration image"}
          loading="lazy"
        />
      ) : null}
      <div className="meta">
        <input
          className="field"
          type="text"
          placeholder="Why it's useful"
          value={note}
          disabled={!canEdit}
          aria-label="Note"
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => note !== (item.note ?? "") && edit({ note })}
        />
        <select
          className="field"
          value={item.client_id ?? ""}
          disabled={!canEdit}
          aria-label="Client"
          onChange={(e) => edit({ clientId: e.target.value })}
        >
          <option value="">Any client</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="chips">
          {INSPIRATION_TAGS.map((t) => (
            <button
              key={t}
              type="button"
              className="chip"
              disabled={!canEdit || pending}
              aria-pressed={tags.includes(t)}
              style={{
                padding: "2px 8px",
                fontSize: 11.5,
                ...(tags.includes(t)
                  ? {
                      background: "var(--navy)",
                      borderColor: "var(--navy)",
                      color: "var(--on-navy)",
                    }
                  : {}),
              }}
              onClick={() => {
                const next = tags.includes(t)
                  ? tags.filter((x) => x !== t)
                  : [...tags, t];
                setTags(next);
                edit({ tags: next });
              }}
            >
              {t}
            </button>
          ))}
        </div>
        {canEdit ? (
          <button
            className="link"
            type="button"
            style={{ justifySelf: "start", color: "var(--bad)" }}
            disabled={pending}
            onClick={() =>
              start(
                async () => void report(await deleteInspirationAction(item.id)),
              )
            }
          >
            Remove
          </button>
        ) : null}
      </div>
    </figure>
  );
}
