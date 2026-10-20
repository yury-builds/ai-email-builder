"use client";

import * as React from "react";
import { brands } from "@/lib/brands";
import { previewPackage } from "@/lib/braze/package";
import { PROFILE_SAMPLES } from "@/lib/profiles";
import type { EmailDoc } from "@/lib/types";
import type { ConnectionCheckResponse } from "@/pages/api/braze/connection";
import type { PublishResponse } from "@/pages/api/braze/publish";

type Result = PublishResponse["results"][number];
type Connection = PublishResponse["connection"];
type Status = { realEnabled: boolean; workspaces: { workspace: string; configured: boolean }[] };

const workspaces = Array.from(new Set(brands.map((b) => b.workspace)));

export function PublishModal({
  doc,
  docKey: initialKey,
  defaultBrandId,
  onClose,
}: {
  doc: EmailDoc;
  docKey: string;
  defaultBrandId?: string;
  onClose: () => void;
}) {
  const [docKey, setDocKey] = React.useState(initialKey);
  const [selected, setSelected] = React.useState<Set<string>>(
    () => new Set(defaultBrandId && brands.some((b) => b.id === defaultBrandId) ? [defaultBrandId] : []),
  );
  const [filter, setFilter] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [response, setResponse] = React.useState<PublishResponse | null>(null);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [profileId, setProfileId] = React.useState(PROFILE_SAMPLES[0].id);
  const [showPayload, setShowPayload] = React.useState(false);
  const [connection, setConnection] = React.useState<Connection>("dry-run");
  const [liveStyles, setLiveStyles] = React.useState(false);
  const [status, setStatus] = React.useState<Status | null>(null);
  const [check, setCheck] = React.useState<ConnectionCheckResponse | null>(null);
  const [view, setView] = React.useState<"results" | "connection">("results");

  React.useEffect(() => {
    fetch("/api/braze/connection")
      .then((r) => r.json())
      .then((s: Status) => setStatus(s))
      .catch(() => setStatus(null));
  }, []);

  const visible = brands.filter((b) => `${b.name} ${b.id} ${b.workspace}`.toLowerCase().includes(filter.toLowerCase()));
  const active = response?.results.find((r) => r.brandId === activeId) ?? null;

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function run(action: "stage" | "promote") {
    if (!selected.size || !docKey.trim() || pending) return;
    if (
      action === "promote" &&
      connection === "braze" &&
      !window.confirm(`Promote ${selected.size} brand(s) to production in real Braze? Updated Content Blocks change live sends.`)
    ) {
      return;
    }
    setPending(true);
    setError(null);
    setView("results");
    try {
      const res = await fetch(action === "stage" ? "/api/braze/publish" : "/api/braze/promote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          doc,
          docKey: docKey.trim(),
          brandIds: Array.from(selected),
          connection,
          stage: "staging",
          liveStyles,
        }),
      });
      const data = (await res.json()) as PublishResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || `Server returned ${res.status}`);
      setResponse(data);
      setActiveId((id) => (id && data.results.some((r) => r.brandId === id) ? id : data.results[0]?.brandId ?? null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPending(false);
    }
  }

  async function runCheck() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/braze/connection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ connection }),
      });
      setCheck((await res.json()) as ConnectionCheckResponse);
      setView("connection");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check failed");
    } finally {
      setPending(false);
    }
  }

  const realReady = Boolean(status?.realEnabled && status.workspaces.some((w) => w.configured));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-6xl h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h3 className="text-lg font-semibold text-ink">Publish to Braze</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {connection === "dry-run"
                ? "Simulated Braze — applies the documented API limits. Nothing leaves this machine."
                : "Real Braze — requests go to your configured workspaces."}{" "}
              Publish goes to staging names first; promote copies what's staged onto production.
            </p>
          </div>
          <div className="flex items-center gap-3 mr-4 text-xs">
            <div className="inline-flex rounded-md border border-slate-200 overflow-hidden">
              <button
                onClick={() => setConnection("dry-run")}
                className={`px-2.5 py-1 ${connection === "dry-run" ? "bg-ink text-white" : "text-slate-600"}`}
              >
                Simulated
              </button>
              <button
                onClick={() => setConnection("braze")}
                disabled={!realReady}
                title={realReady ? "" : "Set BRAZE_MODE=live and workspace credentials on the server to enable"}
                className={`px-2.5 py-1 disabled:opacity-40 ${connection === "braze" ? "bg-red-600 text-white" : "text-slate-600"}`}
              >
                Real Braze
              </button>
            </div>
            <button onClick={runCheck} disabled={pending} className="text-accent whitespace-nowrap disabled:opacity-40">
              Check connection
            </button>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Brand picker */}
          <div className="w-64 shrink-0 border-r border-slate-200 flex flex-col min-h-0">
            <div className="p-3 space-y-2 border-b border-slate-100">
              <label className="block text-[11px] uppercase tracking-wide text-slate-500 font-medium">Template key</label>
              <input
                value={docKey}
                onChange={(e) => setDocKey(e.target.value)}
                className="w-full px-2 py-1 text-sm rounded border border-slate-300 focus:border-accent outline-none"
              />
              <p className="text-[11px] text-slate-400">Published as “[brand] {docKey || "…"}”.</p>
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter brands…"
                className="w-full px-2 py-1 text-sm rounded border border-slate-300 focus:border-accent outline-none"
              />
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">
                  {selected.size} of {brands.length} selected
                </span>
                <span className="space-x-2">
                  <button className="text-accent" onClick={() => setSelected(new Set(visible.map((b) => b.id)))}>
                    All
                  </button>
                  <button className="text-slate-500" onClick={() => setSelected(new Set())}>
                    None
                  </button>
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {workspaces.map((ws) => {
                const list = visible.filter((b) => b.workspace === ws);
                if (!list.length) return null;
                return (
                  <div key={ws} className="mb-2">
                    <div className="px-1 py-1 text-[10px] uppercase tracking-wide text-slate-400">Workspace · {ws}</div>
                    {list.map((b) => (
                      <label key={b.id} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-slate-50 text-sm">
                        <input type="checkbox" checked={selected.has(b.id)} onChange={() => toggle(b.id)} />
                        <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: b.theme.brand }} />
                        <span className="truncate">{b.name}</span>
                      </label>
                    ))}
                  </div>
                );
              })}
            </div>
            <div className="p-3 border-t border-slate-200 space-y-2">
              <label
                className="flex items-start gap-2 text-[11px] text-slate-600"
                title="Colors and fonts come from a per-brand stylesheet Content Block, so changing a brand token restyles every email of that brand in Braze, including live ones."
              >
                <input type="checkbox" checked={liveStyles} onChange={(e) => setLiveStyles(e.target.checked)} />
                <span>
                  Live brand styles <span className="text-amber-600">(experimental)</span>
                </span>
              </label>
              <button
                onClick={() => run("stage")}
                disabled={!selected.size || !docKey.trim() || pending}
                className="w-full text-sm font-medium px-3 py-2 rounded-md bg-ink text-white disabled:opacity-40"
              >
                {pending ? "Working…" : `Publish to staging (${selected.size})`}
              </button>
              <button
                onClick={() => run("promote")}
                disabled={!selected.size || !docKey.trim() || pending}
                className="w-full text-xs font-medium px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Promote staged to production
              </button>
              {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
            </div>
          </div>

          {/* Results */}
          <div className="w-72 shrink-0 border-r border-slate-200 overflow-y-auto">
            {response ? (
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                {response.stage === "staging" ? "Published to staging" : "Promoted to production"} ·{" "}
                {response.connection === "dry-run" ? "simulated" : "real Braze"}
              </div>
            ) : null}
            {!response ? (
              <p className="p-4 text-sm text-slate-500">Pick brands and publish to staging to see what would be sent.</p>
            ) : (
              response.results.map((r) => (
                <button
                  key={r.brandId}
                  onClick={() => setActiveId(r.brandId)}
                  className={`w-full text-left px-3 py-2 border-b border-slate-100 hover:bg-slate-50 ${
                    r.brandId === activeId ? "bg-slate-50" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <StatusDot result={r} />
                    <span className="text-sm font-medium text-ink truncate">{r.brandName}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 pl-4">{summarize(r)}</div>
                </button>
              ))
            )}
          </div>

          {/* Detail */}
          <div className="flex-1 min-w-0 flex flex-col">
            {view === "connection" && check ? (
              <ConnectionReport check={check} onClose={() => setView("results")} />
            ) : active ? (
              <Detail
                result={active}
                profileId={profileId}
                onProfile={setProfileId}
                showPayload={showPayload}
                onTogglePayload={() => setShowPayload((v) => !v)}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({
  result,
  profileId,
  onProfile,
  showPayload,
  onTogglePayload,
}: {
  result: Result;
  profileId: string;
  onProfile: (id: string) => void;
  showPayload: boolean;
  onTogglePayload: () => void;
}) {
  const pkg = result.package;
  const profile = PROFILE_SAMPLES.find((p) => p.id === profileId) ?? PROFILE_SAMPLES[0];
  const preview = React.useMemo(() => (pkg ? previewPackage(pkg, profile.vars) : null), [pkg, profile]);

  return (
    <>
      <div className="px-4 py-3 border-b border-slate-200 space-y-2 max-h-[45%] overflow-y-auto">
        <div className="text-xs text-slate-500">
          Workspace <b className="text-slate-700">{result.workspace}</b> · {result.mode === "live" ? "real Braze" : "simulated"}
        </div>
        <ul className="space-y-1">
          {result.actions.map((a, i) => (
            <li key={i} className="text-xs">
              <span className={actionColor(a.action)}>{a.action}</span>{" "}
              <span className="text-slate-500">{a.kind === "content_block" ? "Content Block" : "Email template"}</span>{" "}
              <code className="text-slate-700">{a.name}</code>
              {a.note ? <div className="text-[11px] text-amber-700 pl-2">{a.note}</div> : null}
              {a.error ? <div className="text-[11px] text-red-600 pl-2">{a.error}</div> : null}
            </li>
          ))}
        </ul>
        {result.issues.length ? (
          <ul className="space-y-1">
            {result.issues.map((i, n) => (
              <li
                key={n}
                className={`text-[11px] rounded px-2 py-1 ${
                  i.level === "error" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"
                }`}
              >
                {i.message}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-slate-100 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-slate-500 whitespace-nowrap">Preview as</span>
          <select value={profileId} onChange={(e) => onProfile(e.target.value)} className="border rounded px-1 py-0.5">
            {PROFILE_SAMPLES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {preview ? <span className="text-slate-500 truncate">Subject: {preview.subject}</span> : null}
        </div>
        <button onClick={onTogglePayload} className="text-accent whitespace-nowrap shrink-0">
          {showPayload ? "Show preview" : "Show API payload"}
        </button>
      </div>
      <div className="flex-1 min-h-0 bg-slate-100">
        {pkg && showPayload ? (
          <pre className="h-full overflow-auto p-3 text-[11px] leading-relaxed">
            {JSON.stringify(
              {
                "POST /content_blocks/create|update": pkg.contentBlocks.map((b) => ({ ...b, content: clip(b.content) })),
                "POST /templates/email/create|update": {
                  ...pkg.template,
                  body: clip(pkg.template.body),
                  plaintext_body: clip(pkg.template.plaintext_body ?? ""),
                },
              },
              null,
              2,
            )}
          </pre>
        ) : preview ? (
          <iframe title="Braze preview" srcDoc={preview.html} className="w-full h-full bg-white" sandbox="" />
        ) : null}
      </div>
      {preview?.unsupported.length ? (
        <div className="px-4 py-1.5 text-[11px] text-slate-500 border-t border-slate-200">
          Not evaluated in preview: {preview.unsupported.join(", ")}
        </div>
      ) : null}
    </>
  );
}

function ConnectionReport({ check, onClose }: { check: ConnectionCheckResponse; onClose: () => void }) {
  const color = { ok: "text-emerald-700", missing: "text-red-600", error: "text-red-600", untested: "text-slate-400" };
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-ink">API key permissions</h4>
        <button onClick={onClose} className="text-xs text-accent">
          Back to results
        </button>
      </div>
      {check.results.map((r) => (
        <div key={r.workspace}>
          <div className="text-xs font-medium text-slate-700 mb-1">Workspace · {r.workspace}</div>
          {r.error ? <p className="text-xs text-red-600">{r.error}</p> : null}
          <ul className="space-y-0.5">
            {r.checks.map((c) => (
              <li key={c.permission} className="text-xs flex gap-2">
                <span className={`w-16 shrink-0 font-medium ${color[c.status]}`}>{c.status}</span>
                <code className="text-slate-700">{c.permission}</code>
                {c.message ? <span className="text-slate-400 truncate">{c.message}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function StatusDot({ result }: { result: Result }) {
  const errors = result.issues.some((i) => i.level === "error") || result.actions.some((a) => a.action === "failed");
  const warnings = result.issues.length > 0;
  const color = errors ? "bg-red-500" : warnings ? "bg-amber-400" : "bg-emerald-500";
  return <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} />;
}

function summarize(r: Result): string {
  if (r.actions.some((a) => a.action === "skipped" || a.action === "failed")) {
    const errors = r.issues.filter((i) => i.level === "error").length;
    return errors ? `Skipped — ${errors} error${errors > 1 ? "s" : ""}` : "Failed";
  }
  const counts = new Map<string, number>();
  for (const a of r.actions) counts.set(a.action, (counts.get(a.action) ?? 0) + 1);
  const warnings = r.issues.length ? ` · ${r.issues.length} warning${r.issues.length > 1 ? "s" : ""}` : "";
  return Array.from(counts, ([k, v]) => `${v} ${k}`).join(", ") + warnings;
}

function actionColor(action: string): string {
  if (action === "created") return "text-emerald-700 font-medium";
  if (action === "updated") return "text-blue-700 font-medium";
  if (action === "failed" || action === "skipped") return "text-red-600 font-medium";
  return "text-slate-500 font-medium";
}

function clip(s: string): string {
  return s.length > 600 ? `${s.slice(0, 600)}… (${s.length} chars)` : s;
}
