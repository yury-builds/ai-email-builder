"use client";

import * as React from "react";
import type { EmailDoc } from "@/lib/types";
import { detectVars } from "@/lib/vars";

export function VariablesPopover({
  doc,
  onChange,
}: {
  doc: EmailDoc;
  onChange: (vars: Record<string, string>) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const detected = detectVars(doc);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const vars = doc.vars ?? {};

  function setVar(key: string, value: string) {
    onChange({ ...vars, [key]: value });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium px-2.5 py-1.5 rounded-md text-slate-700 hover:bg-slate-100"
      >
        {`{{ vars }}`}
        {detected.length > 0 ? <span className="ml-1 text-accent">·{detected.length}</span> : null}
      </button>
      {open ? (
        <div className="absolute right-0 mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-lg p-3 z-50">
          <div className="text-xs uppercase tracking-wide text-slate-500 font-medium mb-2">Preview variables</div>
          {detected.length === 0 ? (
            <p className="text-xs text-slate-500">
              No <code className="font-mono">{`{{var}}`}</code> placeholders detected. Add some to copy and they&apos;ll show up
              here.
            </p>
          ) : (
            <div className="space-y-2">
              {detected.map((key) => (
                <div key={key}>
                  <label className="block text-[11px] font-mono text-slate-500 mb-0.5">{`{{${key}}}`}</label>
                  <input
                    value={vars[key] ?? ""}
                    onChange={(e) => setVar(key, e.target.value)}
                    placeholder={`Test value for ${key}`}
                    className="w-full px-2 py-1 text-sm rounded border border-slate-300 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
                  />
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-[11px] text-slate-400">
            Values are substituted in the preview and the test send. They&apos;re not saved with the template.
          </p>
        </div>
      ) : null}
    </div>
  );
}
