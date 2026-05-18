"use client";

import * as React from "react";
import type { EmailDoc } from "@/lib/types";
import { saveUserTemplate } from "@/lib/user-templates";

type Props = {
  doc: EmailDoc;
  onClose: () => void;
  onSaved?: (id: string) => void;
};

export function SaveTemplateModal({ doc, onClose, onSaved }: Props) {
  const [name, setName] = React.useState(doc.subject || "Untitled template");
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function handleSave() {
    if (!name.trim()) {
      setError("Give the template a name.");
      return;
    }
    setSaving(true);
    try {
      const tpl = saveUserTemplate({ name, description, doc });
      onSaved?.(tpl.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save template.");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-ink">Save as template</h2>
        <p className="mt-1 text-sm text-slate-600">
          Stored in this browser. It&apos;ll appear in your template library.
        </p>

        <label className="block mt-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Spring promo"
          className="mt-1 w-full text-sm px-3 py-2 rounded-md border border-slate-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
        />

        <label className="block mt-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's this template for?"
          rows={3}
          className="mt-1 w-full text-sm px-3 py-2 rounded-md border border-slate-200 focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none resize-none"
        />

        {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="text-sm font-medium px-3 py-1.5 rounded-md text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-sm font-medium px-3 py-1.5 rounded-md bg-ink text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save template"}
          </button>
        </div>
      </div>
    </div>
  );
}
