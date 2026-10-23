"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ActionState } from "@/lib/auth/action-state";
import { cx } from "@/lib/cx";

// The prototype's toast: one short line at the bottom of the screen.

type Say = (message: string, kind?: "ok" | "err") => void;
const ToastContext = createContext<Say>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{
    message: string;
    kind: "ok" | "err";
  } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const say = useCallback<Say>((message, kind = "ok") => {
    setToast({ message, kind });
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => setToast(null),
      kind === "err" ? 6000 : 2600,
    );
  }, []);
  return (
    <ToastContext.Provider value={say}>
      {children}
      {toast ? (
        <div
          className={cx("toast", toast.kind === "err" && "err")}
          role={toast.kind === "err" ? "alert" : "status"}
        >
          {toast.message}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/** Shows an action's result: errors always, success only when asked. */
export function useReport() {
  const say = useToast();
  return useCallback(
    (result: ActionState, { quiet = false } = {}) => {
      if (result.error) say(result.error, "err");
      else if (result.ok && !quiet) say(result.ok);
      return !result.error;
    },
    [say],
  );
}
