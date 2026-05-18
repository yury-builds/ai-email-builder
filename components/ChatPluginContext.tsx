"use client";

import * as React from "react";
import type { EmailDoc, PlannerOp } from "@/lib/types";

export type ChatPluginContextValue = {
  doc: EmailDoc;
  onOps: (ops: PlannerOp[], opts?: { remount?: boolean }) => void;
};

const Ctx = React.createContext<ChatPluginContextValue | null>(null);

export function ChatPluginProvider({ value, children }: { value: ChatPluginContextValue; children: React.ReactNode }) {
  // Hold the value in a ref-like object so plugin renders always read the latest
  // doc/onOps without forcing Puck to remount the plugin tab on every keystroke.
  const ref = React.useRef(value);
  ref.current = value;
  const stable = React.useMemo<ChatPluginContextValue>(
    () => ({
      get doc() {
        return ref.current.doc;
      },
      get onOps() {
        return ref.current.onOps;
      },
    }),
    [],
  );
  return <Ctx.Provider value={stable}>{children}</Ctx.Provider>;
}

export function useChatPluginContext(): ChatPluginContextValue {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useChatPluginContext must be used inside ChatPluginProvider");
  return ctx;
}
