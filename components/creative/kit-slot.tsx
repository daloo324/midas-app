"use client";

import { useState, useTransition } from "react";
import {
  registerKitFileAction,
  removeKitFileAction,
} from "@/app/creative/actions";
import { useToast } from "@/components/shared/toast";
import { cx } from "@/lib/cx";
import {
  extensionOf,
  slotAccepts,
  slotExtensions,
} from "@/lib/creative/constants";
import type { KitFile } from "@/lib/data/creative";
import { createClient } from "@/lib/supabase/browser";

const MAX = 50 * 1024 * 1024;

function kb(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function safeName(name: string) {
  return name
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(-80);
}

/** Uploads a file into a kit slot: browser to storage, then the server records it. */
export function useKitUpload(clientId: string) {
  const say = useToast();
  const [busy, setBusy] = useState(false);
  const upload = async (slot: string, file: File) => {
    if (!slotAccepts(slot, file.name)) {
      say(
        `That slot takes ${slotExtensions(slot)
          .map((e) => e.toUpperCase())
          .join(", ")} files only.`,
        "err",
      );
      return false;
    }
    if (file.size > MAX) {
      say(`${file.name} is over 50 MB.`, "err");
      return false;
    }
    setBusy(true);
    try {
      const path = `${clientId}/${slot}/${crypto.randomUUID().slice(0, 8)}-${safeName(file.name)}`;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("brand-kits")
        .upload(path, file, {
          contentType: file.type || undefined,
          upsert: false,
        });
      if (error) {
        say(
          `${file.name} didn't upload. Check the file type and try again.`,
          "err",
        );
        return false;
      }
      const result = await registerKitFileAction({
        clientId,
        slot,
        path,
        name: file.name,
        size: file.size,
        mime: file.type || null,
      });
      if (result.error) say(result.error, "err");
      return !result.error;
    } finally {
      setBusy(false);
    }
  };
  return { upload, busy };
}

export function KitSlot({
  clientId,
  slot,
  label,
  file,
  canEdit,
}: {
  clientId: string;
  slot: string;
  label: string;
  file: KitFile | undefined;
  canEdit: boolean;
}) {
  const { upload, busy } = useKitUpload(clientId);
  const [removing, start] = useTransition();
  const say = useToast();
  const accept = slotExtensions(slot)
    .map((e) => `.${e}`)
    .join(",");
  const dark = slot.includes("_white_");
  const input = (text: string) => (
    <input
      type="file"
      hidden
      accept={accept}
      aria-label={`${label}: ${text}`}
      disabled={busy}
      onChange={(e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (f) void upload(slot, f);
      }}
    />
  );

  if (busy) {
    return (
      <div className="kslot">
        <div className="kname">
          <b>{label}</b>
          <span>Uploading…</span>
        </div>
      </div>
    );
  }
  if (file) {
    const isImage =
      (file.mime_type ?? "").startsWith("image/") ||
      ["svg", "png", "jpg", "jpeg"].includes(extensionOf(file.file_name));
    return (
      <div className="kslot filled" data-slot={slot}>
        <div className={cx("kprev", dark && "dark")}>
          {isImage && file.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
            <img src={file.url} alt={label} />
          ) : (
            <span>{extensionOf(file.file_name).toUpperCase()}</span>
          )}
        </div>
        <div className="kname">
          <b>{label}</b>
          <span title={file.file_name}>
            {file.file_name} · {kb(file.size_bytes)}
          </span>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {file.url ? (
            <a className="btn sm" href={file.url} download={file.file_name}>
              Download
            </a>
          ) : null}
          {canEdit ? (
            <>
              <label className="btn sm">Replace{input("replace")}</label>
              <button
                className="link"
                type="button"
                disabled={removing}
                style={{ color: "var(--bad)", fontSize: 12.5 }}
                onClick={() =>
                  start(async () => {
                    const r = await removeKitFileAction(file.id);
                    if (r.error) say(r.error, "err");
                  })
                }
              >
                Remove
              </button>
            </>
          ) : null}
        </div>
      </div>
    );
  }
  return canEdit ? (
    <label className="kslot empty-slot" data-slot={slot}>
      <div className="kname">
        <b>{label}</b>
        <span>
          Upload{" "}
          {slotExtensions(slot)
            .map((e) => e.toUpperCase())
            .join(", ")}
        </span>
      </div>
      {input("upload")}
    </label>
  ) : (
    <div className="kslot empty-slot" data-slot={slot}>
      <div className="kname">
        <b>{label}</b>
        <span>Not uploaded</span>
      </div>
    </div>
  );
}
