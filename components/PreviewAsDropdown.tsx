"use client";

import * as React from "react";
import { PROFILE_SAMPLES, type ProfileSample } from "@/lib/profiles";

export function PreviewAsDropdown({
  selectedId,
  onSelect,
  onClear,
}: {
  selectedId: string | null;
  onSelect: (profile: ProfileSample) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const selected = selectedId ? PROFILE_SAMPLES.find((p) => p.id === selectedId) : undefined;
  const label = selected ? selected.name : "Default";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium px-2.5 py-1.5 rounded-md text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1"
      >
        <span className="text-slate-500">Preview as:</span>
        <span>{label}</span>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 4.5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div className="absolute right-0 mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-lg p-1.5 z-50">
          <button
            onClick={() => {
              onClear();
              setOpen(false);
            }}
            className={`w-full text-left px-2.5 py-2 rounded-md hover:bg-slate-50 ${
              selectedId === null ? "bg-slate-50" : ""
            }`}
          >
            <div className="text-sm font-medium text-ink">Default</div>
            <div className="text-[11px] text-slate-500">No personalization — show raw placeholders</div>
          </button>
          <div className="my-1 border-t border-slate-100" />
          {PROFILE_SAMPLES.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onSelect(p);
                setOpen(false);
              }}
              className={`w-full text-left px-2.5 py-2 rounded-md hover:bg-slate-50 ${
                selectedId === p.id ? "bg-slate-50" : ""
              }`}
            >
              <div className="text-sm font-medium text-ink">{p.name}</div>
              <div className="text-[11px] text-slate-500">{p.description}</div>
            </button>
          ))}
          <div className="px-2.5 py-1.5 text-[11px] text-slate-400 border-t border-slate-100 mt-1">
            Swaps personalization tokens live in the preview.
          </div>
        </div>
      ) : null}
    </div>
  );
}
