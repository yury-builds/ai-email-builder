import type { EmailDoc } from "./types";

const STORAGE_KEY = "emailStudio.userTemplates.v1";

export type UserTemplate = {
  id: string;
  name: string;
  description: string;
  doc: EmailDoc;
  createdAt: number;
  updatedAt: number;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function read(): UserTemplate[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as UserTemplate[];
  } catch {
    return [];
  }
}

function write(list: UserTemplate[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  // Notify other tabs / components in this tab
  window.dispatchEvent(new Event("user-templates-changed"));
}

export function listUserTemplates(): UserTemplate[] {
  return read().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getUserTemplate(id: string): UserTemplate | undefined {
  return read().find((t) => t.id === id);
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "template";
}

function uniqueId(seed: string, existing: Set<string>): string {
  let candidate = `user-${seed}`;
  let n = 2;
  while (existing.has(candidate)) {
    candidate = `user-${seed}-${n}`;
    n += 1;
  }
  return candidate;
}

export function saveUserTemplate(input: {
  name: string;
  description: string;
  doc: EmailDoc;
}): UserTemplate {
  const list = read();
  const ids = new Set(list.map((t) => t.id));
  const id = uniqueId(slugify(input.name), ids);
  const now = Date.now();
  const tpl: UserTemplate = {
    id,
    name: input.name.trim() || "Untitled template",
    description: input.description.trim(),
    doc: input.doc,
    createdAt: now,
    updatedAt: now,
  };
  write([tpl, ...list]);
  return tpl;
}

export function deleteUserTemplate(id: string): void {
  const next = read().filter((t) => t.id !== id);
  write(next);
}

export function subscribeUserTemplates(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  const handler = () => cb();
  window.addEventListener("user-templates-changed", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("user-templates-changed", handler);
    window.removeEventListener("storage", handler);
  };
}
