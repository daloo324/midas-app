"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  useSyncExternalStore,
} from "react";
import {
  STEPS,
  UPLOADS_PER_QUESTION,
  answerText,
  briefAnswers,
  type Answers,
  type ArtKey,
  type Field,
  type Option,
} from "@/lib/questionnaire/steps";
import { createClient } from "@/lib/supabase/browser";
import { submitQuestionnaire } from "./actions";
import { Header } from "./header";

// The brand discovery questionnaire (docs/prototypes/brand-questionnaire.html).
// Typed answers are kept on this device until they're sent; images upload to
// the client's brief as soon as they're added.

type Upload = { path: string; name: string; note: string; preview?: string };
type Saved = {
  answers: Answers;
  current: number;
  uploads: Record<string, Upload[]>;
};

const ART: Record<ArtKey, string> = {
  wordmark:
    '<svg viewBox="0 0 160 72"><text x="80" y="46" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="900" font-size="26" fill="currentColor" style="font-stretch:120%">KGOSI</text></svg>',
  letter:
    '<svg viewBox="0 0 160 72"><circle cx="80" cy="36" r="26" fill="currentColor"/><text x="80" y="45" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="900" font-size="24" fill="#C49A47">KC</text></svg>',
  combo:
    '<svg viewBox="0 0 160 72"><path d="M30 50 L44 20 L58 50 Z" fill="#C49A47"/><rect x="68" y="26" width="64" height="9" rx="2" fill="currentColor"/><rect x="68" y="41" width="42" height="6" rx="2" fill="currentColor" opacity=".45"/></svg>',
  emblem:
    '<svg viewBox="0 0 160 72"><circle cx="80" cy="36" r="29" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="80" cy="36" r="22" fill="none" stroke="#C49A47" stroke-width="1.5" stroke-dasharray="3 3"/><text x="80" y="41" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="900" font-size="13" fill="currentColor">EST.</text></svg>',
  mascot:
    '<svg viewBox="0 0 160 72"><circle cx="80" cy="38" r="24" fill="#C49A47"/><circle cx="71" cy="34" r="3.5" fill="currentColor"/><circle cx="89" cy="34" r="3.5" fill="currentColor"/><path d="M70 45 Q80 53 90 45" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M62 18 L68 26 M98 18 L92 26" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
  unsure:
    '<svg viewBox="0 0 160 72"><text x="80" y="50" text-anchor="middle" font-family="Archivo, sans-serif" font-weight="800" font-size="36" fill="currentColor" opacity=".35">?</text></svg>',
};

const REVIEW = STEPS.length; // index of the "Review & send" step
const MAX_BYTES = 10 * 1024 * 1024;

/** Shrinks a photo to at most 1400px as a JPEG, like the prototype. */
function compress(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("encode"))),
        "image/jpeg",
        0.82,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode"));
    };
    img.src = url;
  });
}

/** Waits until it's in the browser, then starts from this device's saved draft. */
export function Questionnaire(props: {
  token: string;
  clientId: string;
  businessName: string;
}) {
  const inBrowser = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  if (!inBrowser) return <Header />;
  return <Form {...props} saved={readSaved(`midas-brief-${props.token}`)} />;
}

function readSaved(key: string): Saved | null {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") as Saved | null;
  } catch {
    return null; // storage blocked or corrupt: start fresh
  }
}

function Form({
  token,
  clientId,
  businessName,
  saved,
}: {
  token: string;
  clientId: string;
  businessName: string;
  saved: Saved | null;
}) {
  const key = `midas-brief-${token}`;
  const [answers, setAnswers] = useState<Answers>(() => ({
    biz_name: businessName,
    ...saved?.answers,
  }));
  const [current, setCurrent] = useState(() =>
    Math.min(saved?.current || 0, REVIEW),
  );
  const [uploads, setUploads] = useState<Record<string, Upload[]>>(
    () => saved?.uploads ?? {},
  );
  const [busy, setBusy] = useState(0);
  const [invalid, setInvalid] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sent, setSent] = useState(false);
  const shellRef = useRef<HTMLElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (sent) return;
    try {
      const plain = Object.fromEntries(
        Object.entries(uploads).map(([k, list]) => [
          k,
          list.map(({ path, name, note }) => ({ path, name, note })),
        ]),
      );
      localStorage.setItem(
        key,
        JSON.stringify({ answers, current, uploads: plain } satisfies Saved),
      );
    } catch {
      // Not saved on this device; the form still works.
    }
  }, [key, answers, current, uploads, sent]);

  // On a phone the sections are a sideways strip; keep the current one in view.
  useEffect(() => {
    document
      .querySelector(".qn .rail li.on")
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [current]);

  const say = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }, []);

  const set = (id: string, value: Answers[string]) =>
    setAnswers((a) => ({ ...a, [id]: value }));
  const biz = () =>
    (typeof answers.biz_name === "string" && answers.biz_name.trim()) ||
    "Your Brand";

  function go(i: number) {
    if (i > current && current === 0) {
      const missing = STEPS[0].fields
        .filter((f) => f.required && !String(answers[f.id] ?? "").trim())
        .map((f) => f.id);
      setInvalid(missing);
      if (missing.length) {
        document.getElementById(missing[0])?.focus();
        return;
      }
    }
    setCurrent(Math.max(0, Math.min(REVIEW, i)));
    requestAnimationFrame(() =>
      window.scrollTo({
        top: (shellRef.current?.offsetTop ?? 0) - 10,
        behavior: "smooth",
      }),
    );
  }

  async function addFiles(id: string, files: FileList | null) {
    const images = [...(files ?? [])].filter((f) =>
      f.type.startsWith("image/"),
    );
    if (!images.length) return say("Please choose image files.");
    const supabase = createClient();
    for (const file of images) {
      if ((uploads[id]?.length ?? 0) + 1 > UPLOADS_PER_QUESTION) {
        say(`That's the limit of ${UPLOADS_PER_QUESTION} images here.`);
        break;
      }
      setBusy((n) => n + 1);
      try {
        // Phones can't always shrink HEIC; send those as they are.
        const blob = await compress(file).catch(() => file);
        if (blob.size > MAX_BYTES) {
          say(`${file.name} is over 10 MB. Choose a smaller image.`);
          continue;
        }
        const ext =
          blob.type === "image/jpeg"
            ? "jpg"
            : (file.name.split(".").pop() || "img").toLowerCase();
        const path = `${clientId}/questionnaire/${token}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from("briefs")
          .upload(path, blob, { contentType: blob.type, upsert: false });
        if (error) {
          say(
            `${file.name} didn't upload. Check your connection and try again.`,
          );
          continue;
        }
        const upload = {
          path,
          name: file.name,
          note: "",
          preview: URL.createObjectURL(blob),
        };
        setUploads((u) => ({ ...u, [id]: [...(u[id] ?? []), upload] }));
      } finally {
        setBusy((n) => n - 1);
      }
    }
  }

  async function send() {
    setSending(true);
    setSendError("");
    const files = STEPS.flatMap((s) =>
      s.fields
        .filter((f) => f.type === "upload")
        .flatMap((f) =>
          (uploads[f.id] ?? []).map((u) => ({
            path: u.path,
            note: u.note.trim(),
            question: f.label,
            section: s.title,
          })),
        ),
    );
    const result = await submitQuestionnaire({
      token,
      answers: briefAnswers(answers),
      uploads: files,
    });
    setSending(false);
    if (!result.ok) return setSendError(result.error);
    try {
      localStorage.removeItem(key);
    } catch {}
    setSent(true);
    window.scrollTo({ top: 0 });
  }

  if (sent) {
    return (
      <>
        <Header />
        <div style={{ padding: "0 16px" }}>
          <main className="done-card">
            <div className="eyebrow">Brand discovery questionnaire</div>
            <h2>Thank you. We have your answers.</h2>
            <p>
              Your brief is with Midas Media. Our designers will use it to start
              on your logo, colours and fonts.
            </p>
            <p>
              Your account executive will be in touch within one working day to
              book your kick-off call.
            </p>
          </main>
        </div>
      </>
    );
  }

  const step = current < REVIEW ? STEPS[current] : null;

  return (
    <>
      <Header />
      <section className="hero">
        <div className="hero-in">
          <div className="eyebrow" style={{ color: "var(--gold)" }}>
            Brand discovery questionnaire
          </div>
          <h1>
            Tell us who you are.
            <br />
            <em>We&apos;ll make it look that way.</em>
          </h1>
          <p>
            Your answers guide our designers as they build your logo, colours
            and fonts. There are no wrong answers, and &quot;not sure&quot; is
            always fine. Pictures of things you like help us most.
          </p>
          <div className="meta">
            <span>
              <strong>7 short sections</strong>
            </span>
            <span>
              <strong>About 15 minutes</strong>
            </span>
            <span>
              <strong>Your typing saves</strong> on this device as you go
            </span>
          </div>
        </div>
      </section>

      <main className="shell" ref={shellRef}>
        <nav className="rail" aria-label="Sections">
          <ol>
            {[...STEPS.map((s) => s.title), "Review & send"].map((title, i) => {
              const done =
                i < current ||
                (i < REVIEW && touched(STEPS[i].fields, answers, uploads));
              return (
                <li
                  key={title}
                  className={`${i === current ? "on" : ""} ${done ? "done" : ""}`}
                >
                  <button type="button" onClick={() => go(i)}>
                    <span className="n">{i === REVIEW ? "✓" : i + 1}</span>
                    {title}
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="save-note">
            Text answers save on this device automatically. Images upload to
            Midas Media as soon as you add them.
          </p>
        </nav>

        <form noValidate onSubmit={(e) => e.preventDefault()}>
          <section
            className="step"
            aria-labelledby={`h-${step?.id ?? "review"}`}
          >
            <div className="step-head">
              <div className="eyebrow">
                {step
                  ? `Section ${current + 1} of ${STEPS.length}`
                  : "Final step"}
              </div>
              <h2 id={`h-${step?.id ?? "review"}`}>
                {step?.title ?? "Review & send"}
              </h2>
              <p>
                {step?.intro ?? "Check your answers, then send them to us."}
              </p>
            </div>

            {step ? (
              <div className="fields">
                {step.fields.map((f) => (
                  <FieldInput
                    key={f.id}
                    field={f}
                    value={answers[f.id]}
                    onChange={(v) => {
                      set(f.id, v);
                      if (invalid.includes(f.id) && String(v ?? "").trim())
                        setInvalid((x) => x.filter((id) => id !== f.id));
                    }}
                    invalid={invalid.includes(f.id)}
                    sample={biz()}
                    uploads={uploads[f.id] ?? []}
                    busy={busy > 0}
                    onFiles={(files) => addFiles(f.id, files)}
                    onUploadsChange={(list) =>
                      setUploads((u) => ({ ...u, [f.id]: list }))
                    }
                  />
                ))}
              </div>
            ) : (
              <Review answers={answers} uploads={uploads} onEdit={go}>
                <div className="send">
                  <h3>Send your brief to Midas Media</h3>
                  <p>
                    Your answers and images go straight to your account
                    executive and our designers. You can only send once, so
                    check everything first.
                  </p>
                  <div className="acts">
                    <button
                      type="button"
                      className="btn gold"
                      onClick={send}
                      disabled={sending || busy > 0}
                    >
                      {sending
                        ? "Sending…"
                        : busy > 0
                          ? "Waiting for images to upload…"
                          : "Send to Midas Media"}
                    </button>
                  </div>
                  {sendError ? (
                    <p className="err" role="alert">
                      {sendError}
                    </p>
                  ) : null}
                </div>
              </Review>
            )}

            <div className="nav">
              <button
                type="button"
                className="btn ghost"
                onClick={() => go(current - 1)}
                disabled={current === 0}
              >
                ← Back
              </button>
              {step ? (
                <button
                  type="button"
                  className="btn pri"
                  onClick={() => go(current + 1)}
                >
                  {current === REVIEW - 1 ? "Review answers" : "Next section"} →
                </button>
              ) : null}
            </div>
          </section>
        </form>
      </main>
      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}
    </>
  );
}

function touched(
  fields: Field[],
  answers: Answers,
  uploads: Record<string, Upload[]>,
) {
  return fields.some((f) => {
    if (f.type === "upload") return (uploads[f.id]?.length ?? 0) > 0;
    if (f.type === "sliders") return false;
    const v = answers[f.id];
    return Array.isArray(v) ? v.some(Boolean) : Boolean(v);
  });
}

function FieldInput(props: {
  field: Field;
  value: Answers[string];
  onChange: (v: Answers[string]) => void;
  invalid: boolean;
  sample: string;
  uploads: Upload[];
  busy: boolean;
  onFiles: (files: FileList | null) => void;
  onUploadsChange: (list: Upload[]) => void;
}) {
  const { field: f, value, onChange } = props;
  const label = (
    <>
      {f.label}
      {f.required ? (
        <>
          {" "}
          <span className="req">*</span>
        </>
      ) : null}
    </>
  );
  const hint = f.hint ? <p className="hint">{f.hint}</p> : null;
  const labelled = ["text", "email", "tel", "date", "textarea"].includes(
    f.type,
  );
  const options = (f.options ?? []) as (string | Option)[];
  const selected = Array.isArray(value) ? value : value ? [String(value)] : [];
  const toggle = (v: string) => {
    if (f.single) onChange(value === v ? "" : v);
    else
      onChange(
        selected.includes(v)
          ? selected.filter((x) => x !== v)
          : [...selected, v],
      );
  };

  let input: ReactNode;
  switch (f.type) {
    case "text":
    case "email":
    case "tel":
    case "date":
      input = (
        <>
          <input
            type={f.type}
            id={f.id}
            name={f.id}
            value={String(value ?? "")}
            placeholder={f.placeholder ?? ""}
            autoComplete="off"
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={props.invalid || undefined}
          />
          <div className="err" hidden={!props.invalid}>
            Please fill this in.
          </div>
        </>
      );
      break;
    case "textarea":
      input = (
        <textarea
          id={f.id}
          name={f.id}
          rows={f.rows ?? 4}
          value={String(value ?? "")}
          placeholder={f.placeholder ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
      break;
    case "chips":
      input = (
        <div className="chips" role="group" aria-label={f.label}>
          {(options as string[]).map((o) => (
            <button
              key={o}
              type="button"
              className="chip"
              aria-pressed={selected.includes(o)}
              onClick={() => toggle(o)}
            >
              {o}
            </button>
          ))}
        </div>
      );
      break;
    case "cards":
    case "swatches":
    case "fonts":
      input = (
        <div className="cards" role="group" aria-label={f.label}>
          {(options as Option[]).map((o) => (
            <button
              key={o.v}
              type="button"
              className="card"
              aria-pressed={selected.includes(o.v)}
              onClick={() => toggle(o.v)}
            >
              {f.type === "cards" ? (
                <div
                  className="art"
                  dangerouslySetInnerHTML={{ __html: ART[o.art!] }}
                />
              ) : null}
              {f.type === "swatches" ? (
                <div className="sw">
                  {o.sw!.map((c) => (
                    <i key={c} style={{ background: c }} />
                  ))}
                </div>
              ) : null}
              {f.type === "fonts" ? (
                <div className="font-sample" style={{ fontFamily: o.font }}>
                  {props.sample}
                </div>
              ) : null}
              <strong>{o.v}</strong>
              {o.d ? <small>{o.d}</small> : null}
            </button>
          ))}
        </div>
      );
      break;
    case "sliders": {
      const vals = (value as Record<string, number> | undefined) ?? {};
      input = (
        <div className="sliders">
          {f.pairs!.map(([a, b]) => {
            const k = `${a}|${b}`;
            return (
              <div className="sl" key={k}>
                <span>{a}</span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={vals[k] ?? 3}
                  aria-label={`${a} to ${b}`}
                  onChange={(e) =>
                    onChange({ ...vals, [k]: Number(e.target.value) })
                  }
                />
                <span>{b}</span>
              </div>
            );
          })}
        </div>
      );
      break;
    }
    case "triple": {
      const vals = Array.isArray(value) ? value : ["", "", ""];
      input = (
        <div className="triple">
          {[0, 1, 2].map((i) => (
            <input
              key={i}
              type="text"
              value={vals[i] ?? ""}
              placeholder={f.placeholders![i]}
              aria-label={`Word ${i + 1}`}
              onChange={(e) =>
                onChange(vals.map((v, j) => (j === i ? e.target.value : v)))
              }
            />
          ))}
        </div>
      );
      break;
    }
    case "colors": {
      const vals = Array.isArray(value) ? value : [];
      input = (
        <div className="pick-list">
          {vals.map((c, i) => (
            <span className="pick" key={i}>
              <input
                type="color"
                value={c}
                aria-label={`Colour ${i + 1}`}
                onChange={(e) =>
                  onChange(vals.map((v, j) => (j === i ? e.target.value : v)))
                }
              />
              <code>{c.toUpperCase()}</code>
              <button
                type="button"
                className="x"
                aria-label="Remove colour"
                onClick={() => onChange(vals.filter((_, j) => j !== i))}
              >
                ×
              </button>
            </span>
          ))}
          <button
            type="button"
            className="btn ghost"
            style={{ padding: "9px 16px", fontSize: 14 }}
            onClick={() => onChange([...vals, "#C49A47"])}
          >
            + Add a colour
          </button>
        </div>
      );
      break;
    }
    case "upload":
      input = <UploadBox {...props} />;
      break;
  }

  return (
    <div
      className={`f${f.half ? "half" : ""}${props.invalid ? "invalid" : ""}`}
    >
      {labelled ? (
        <label htmlFor={f.id}>{label}</label>
      ) : (
        <div className="lbl">{label}</div>
      )}
      {hint}
      {input}
    </div>
  );
}

function UploadBox({
  field,
  uploads,
  busy,
  onFiles,
  onUploadsChange,
}: {
  field: Field;
  uploads: Upload[];
  busy: boolean;
  onFiles: (files: FileList | null) => void;
  onUploadsChange: (list: Upload[]) => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <>
      <label
        className={`drop${over ? "over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          onFiles(e.dataTransfer.files);
        }}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          hidden
          aria-label={field.label}
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <strong>
          {busy ? "Uploading…" : "Drop images here or tap to upload"}
        </strong>
        <span>
          JPG, PNG or screenshots · up to {UPLOADS_PER_QUESTION} images
        </span>
      </label>
      <div className="thumbs">
        {uploads.map((u, i) => (
          <div className="thumb" key={u.path}>
            <div
              className="img"
              style={
                u.preview
                  ? { backgroundImage: `url('${u.preview}')` }
                  : undefined
              }
            >
              {u.preview ? null : <span>Uploaded</span>}
              <button
                type="button"
                onClick={() =>
                  onUploadsChange(uploads.filter((_, j) => j !== i))
                }
              >
                Remove
              </button>
            </div>
            <input
              type="text"
              placeholder="What do you like about this?"
              value={u.note}
              aria-label={`Note for image ${i + 1}`}
              onChange={(e) =>
                onUploadsChange(
                  uploads.map((x, j) =>
                    j === i ? { ...x, note: e.target.value } : x,
                  ),
                )
              }
            />
          </div>
        ))}
      </div>
    </>
  );
}

function Review({
  answers,
  uploads,
  onEdit,
  children,
}: {
  answers: Answers;
  uploads: Record<string, Upload[]>;
  onEdit: (i: number) => void;
  children: ReactNode;
}) {
  return (
    <>
      {STEPS.map((s, i) => (
        <div className="rev-sec" key={s.id}>
          <h3>
            {s.title}
            <button type="button" onClick={() => onEdit(i)}>
              Edit
            </button>
          </h3>
          <dl style={{ margin: 0 }}>
            {s.fields.map((f) => {
              let shown: ReactNode = null;
              if (f.type === "upload") {
                const list = uploads[f.id] ?? [];
                shown = list.length ? (
                  <div className="mini-imgs">
                    {list.map((u) =>
                      u.preview ? (
                        // eslint-disable-next-line @next/next/no-img-element -- local blob previews
                        <img
                          key={u.path}
                          src={u.preview}
                          alt={u.note || u.name}
                        />
                      ) : (
                        <span key={u.path} />
                      ),
                    )}
                  </div>
                ) : null;
              } else if (f.type === "sliders") {
                const vals =
                  (answers[f.id] as Record<string, number> | undefined) ?? {};
                shown = f
                  .pairs!.map(([a, b]) => {
                    const n = vals[`${a}|${b}`] ?? 3;
                    return `${a} ${"●".repeat(n).padEnd(5, "○")} ${b}`;
                  })
                  .join("\n");
              } else if (f.type === "colors") {
                const list = (answers[f.id] as string[] | undefined) ?? [];
                shown = list.length
                  ? list.map((c, j) => (
                      <span key={j} style={{ marginRight: 12 }}>
                        <span
                          style={{
                            display: "inline-block",
                            width: 14,
                            height: 14,
                            borderRadius: 3,
                            background: c,
                            verticalAlign: -2,
                            border: "1px solid var(--line)",
                          }}
                        />{" "}
                        {c.toUpperCase()}
                      </span>
                    ))
                  : null;
              } else {
                shown = answerText(f, answers[f.id]) || null;
              }
              return (
                <div className="rev-row" key={f.id}>
                  <dt>{f.label}</dt>
                  <dd>
                    {shown ?? <span className="empty">Not answered</span>}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      ))}
      {children}
    </>
  );
}
