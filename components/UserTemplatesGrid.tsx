"use client";

import * as React from "react";
import Link from "next/link";
import { deleteUserTemplate, listUserTemplates, subscribeUserTemplates, type UserTemplate } from "@/lib/user-templates";

export function UserTemplatesGrid() {
  const [items, setItems] = React.useState<UserTemplate[] | null>(null);

  React.useEffect(() => {
    const refresh = () => setItems(listUserTemplates());
    refresh();
    return subscribeUserTemplates(refresh);
  }, []);

  // SSR / first paint: render nothing until hydrated to avoid mismatch.
  if (items === null) return null;
  if (items.length === 0) return null;

  return (
    <div className="mb-10">
      <h2 className="text-sm uppercase tracking-wider text-slate-500 font-semibold mb-4">Your templates</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((t) => (
          <div key={t.id} className="relative group">
            <Link
              href={`/studio/${t.id}`}
              className="block p-5 rounded-xl bg-white border border-slate-200 hover:border-accent hover:shadow-sm transition"
            >
              <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">saved</div>
              <div className="text-lg font-semibold text-ink pr-8">{t.name}</div>
              <div className="mt-2 text-sm text-slate-600 line-clamp-2">
                {t.description || <span className="text-slate-400 italic">No description</span>}
              </div>
              <div className="mt-3 text-xs text-slate-400">
                {t.doc.data.content?.length ?? 0} blocks · saved {formatRelative(t.updatedAt)}
              </div>
            </Link>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete template "${t.name}"?`)) deleteUserTemplate(t.id);
              }}
              aria-label={`Delete ${t.name}`}
              className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition text-slate-400 hover:text-red-600 text-xs px-1.5 py-0.5 rounded hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}
