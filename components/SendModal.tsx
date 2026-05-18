"use client";

import * as React from "react";
import type { EmailDoc } from "@/lib/types";

export function SendModal({ doc, html, onClose }: { doc: EmailDoc; html: string; onClose: () => void }) {
  const [to, setTo] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [result, setResult] = React.useState<{ kind: "ok"; id: string | null } | { kind: "err"; message: string } | null>(null);

  async function send() {
    if (!to.trim() || pending) return;
    setResult(null);
    setPending(true);
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: to.trim(), subject: doc.subject, html, preheader: doc.preheader }),
      });
      const data = (await res.json()) as { id?: string | null; error?: string };
      if (!res.ok) {
        setResult({ kind: "err", message: data.error || `Server returned ${res.status}` });
      } else {
        setResult({ kind: "ok", id: data.id ?? null });
      }
    } catch (err) {
      setResult({ kind: "err", message: err instanceof Error ? err.message : "Network error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-ink">Send a test email</h3>
            <p className="text-sm text-slate-500 mt-1">We&apos;ll ship the current canvas via Resend.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-500 font-medium mb-1">Recipient</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3 py-2 rounded-md border border-slate-300 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none text-sm"
              autoFocus
            />
          </div>
          <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-2 space-y-0.5">
            <div><span className="text-slate-400">Subject:</span> {doc.subject || "(no subject)"}</div>
            <div><span className="text-slate-400">Preheader:</span> {doc.preheader || "(none)"}</div>
            <div><span className="text-slate-400">Blocks:</span> {doc.data.content?.length ?? 0}</div>
          </div>
          {result?.kind === "ok" ? (
            <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">
              Sent! {result.id ? <span className="text-emerald-600">ID: {result.id}</span> : null}
            </div>
          ) : null}
          {result?.kind === "err" ? (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{result.message}</div>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="text-sm font-medium px-3 py-1.5 rounded-md text-slate-700 hover:bg-slate-100">
            Close
          </button>
          <button
            onClick={send}
            disabled={!to.trim() || pending}
            className="text-sm font-medium px-3 py-1.5 rounded-md bg-ink text-white disabled:opacity-40"
          >
            {pending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
