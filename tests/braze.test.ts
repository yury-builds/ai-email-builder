import { afterEach, describe, expect, it, vi } from "vitest";
import { brands, getBrand, type Brand } from "@/lib/brands";
import { BrazeApi } from "@/lib/braze/api";
import { compileForBrand } from "@/lib/braze/compile-react-email";
import { previewPackage, validatePackage } from "@/lib/braze/package";
import { publishPackages } from "@/lib/braze/publish";
import { stagedPackage } from "@/lib/braze/promote";
import { checkConnection } from "@/lib/braze/connection";
import { BrazeApiError, DryRunTransport, HttpTransport } from "@/lib/braze/transport";
import { getTemplate, templates } from "@/lib/templates";
import type { EmailDoc } from "@/lib/types";

const welcome = getTemplate("welcome")!.doc;

function dryRunWorkspaces() {
  const transports = new Map<string, DryRunTransport>();
  const apiFor = (ws: string) => {
    if (!transports.has(ws)) transports.set(ws, new DryRunTransport(ws));
    return new BrazeApi(transports.get(ws)!);
  };
  return { transports, apiFor };
}

function withText(doc: EmailDoc, body: string): EmailDoc {
  const content = [...(doc.data.content ?? [])];
  content.splice(2, 0, { type: "EmailText", props: { id: "x", body, alignment: "left", emphasis: "normal" } } as never);
  return { ...doc, data: { ...doc.data, content } };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("brand registry", () => {
  it("has 21 brands across 3 workspaces with unique Content Block names", () => {
    expect(brands).toHaveLength(21);
    expect(new Set(brands.map((b) => b.workspace))).toEqual(new Set(["na", "emea", "apac"]));
    expect(new Set(brands.map((b) => b.theme.id)).size).toBe(21);
  });
});

describe("compileForBrand", () => {
  it("themes the body and swaps header/footer for the brand's Content Blocks", async () => {
    const harbor = getBrand("harbor")!;
    const pkg = await compileForBrand(welcome, harbor, "welcome");

    expect(pkg.template.template_name).toBe("[harbor] welcome");
    expect(pkg.template.body).toContain("{{content_blocks.${es_harbor_header}}}");
    expect(pkg.template.body).toContain("{{content_blocks.${es_harbor_footer}}}");
    expect(pkg.template.body).toContain("#0e7490"); // Harbor's brand color on the CTA
    expect(pkg.template.body).not.toContain("Unsubscribe"); // footer markup lives in the block
    expect(pkg.contentBlocks.map((b) => b.name)).toEqual(["es_harbor_header", "es_harbor_footer"]);

    const footer = pkg.contentBlocks[1].content;
    expect(footer).toContain('href="{{${unsubscribe_url}}}"');
    expect(footer).toContain("Harbor Bank N.A.");
    expect(footer).not.toMatch(/<html|<body|DOCTYPE/i);
    expect(pkg.template.plaintext_body).toMatch(/welcome/i);
  });

  it("keeps personalization Liquid intact and never ships preview values", async () => {
    const liquid = `Hi {{\${first_name} | default: "there"}}`;
    const doc = { ...withText(welcome, liquid), vars: { first_name: "Ava" } };
    const pkg = await compileForBrand(doc, getBrand("atlas")!, "welcome");
    expect(pkg.template.body).toContain(liquid);
    expect(pkg.template.body).not.toContain("Ava");
    expect(previewPackage(pkg, { first_name: "Ava" }).html).toContain("Hi Ava");
  });

  it("compiles every built-in template for every brand within Braze limits", async () => {
    vi.stubEnv("ASSET_BASE_URL", "https://cdn.example-brand.com");
    for (const t of templates) {
      for (const brand of brands) {
        const pkg = await compileForBrand(t.doc, brand, t.id);
        const errors = validatePackage(pkg).filter((i) => i.level === "error");
        expect(errors, `${t.id} × ${brand.id}`).toEqual([]);
      }
    }
  });
});

describe("validatePackage", () => {
  it("flags the root-relative logo unless ASSET_BASE_URL is set", async () => {
    const fresh = getBrand("fresh")!;
    const before = validatePackage(await compileForBrand(welcome, fresh, "welcome"));
    expect(before.find((i) => i.code === "relative-url")?.level).toBe("error");

    vi.stubEnv("ASSET_BASE_URL", "https://cdn.example-brand.com");
    const after = validatePackage(await compileForBrand(welcome, fresh, "welcome"));
    expect(after.find((i) => i.code === "relative-url")).toBeUndefined();
  });

  it("warns about bare Liquid names and errors on unclosed tags", async () => {
    const brand = getBrand("lumen")!;
    const bare = validatePackage(await compileForBrand(withText(welcome, "Hi {{first_name}}"), brand, "w"));
    expect(bare.map((i) => i.code)).toContain("liquid-bare-name");
    const broken = validatePackage(await compileForBrand(withText(welcome, "Hi {{${first_name}"), brand, "w"));
    expect(broken.find((i) => i.code === "liquid-unbalanced")?.level).toBe("error");
  });

  it("warns when there's no unsubscribe link", async () => {
    const noFooter: EmailDoc = {
      ...welcome,
      data: { ...welcome.data, content: (welcome.data.content ?? []).filter((c) => c.type !== "EmailFooter") },
    };
    const issues = validatePackage(await compileForBrand(noFooter, getBrand("lumen")!, "w"));
    expect(issues.map((i) => i.code)).toContain("no-unsubscribe");
  });
});

describe("publishing to dry-run Braze", () => {
  async function compileAll(doc: EmailDoc, list: Brand[] = brands) {
    return Promise.all(list.map((b) => compileForBrand(doc, b, "welcome")));
  }

  it("fans out to 21 brands, then is idempotent, then updates only what changed", async () => {
    vi.stubEnv("ASSET_BASE_URL", "https://cdn.example-brand.com");
    const { transports, apiFor } = dryRunWorkspaces();

    const first = await publishPackages(await compileAll(welcome), apiFor);
    expect(first.every((r) => r.ok)).toBe(true);
    expect(first.flatMap((r) => r.actions).every((a) => a.action === "created")).toBe(true);
    expect(transports.size).toBe(3);
    const na = transports.get("na")!.state;
    expect(Object.keys(na.templates)).toHaveLength(brands.filter((b) => b.workspace === "na").length);

    const second = await publishPackages(await compileAll(welcome), apiFor);
    expect(second.flatMap((r) => r.actions).every((a) => a.action === "unchanged")).toBe(true);

    const edited = { ...welcome, subject: "Welcome, {{${first_name}}}" };
    const third = await publishPackages(await compileAll(edited, [getBrand("harbor")!]), apiFor);
    expect(third[0].actions.map((a) => `${a.kind}:${a.action}`)).toEqual([
      "content_block:unchanged",
      "content_block:unchanged",
      "email_template:updated",
    ]);
    expect(third[0].actions[2].note).toMatch(/Existing campaigns keep their copy/);
  });

  it("updating a brand's footer changes the shared block and flags it as live", async () => {
    const { apiFor } = dryRunWorkspaces();
    const harbor = getBrand("harbor")!;
    await publishPackages(await compileAll(welcome, [harbor]), apiFor);

    const moved: Brand = {
      ...harbor,
      chrome: { ...harbor.chrome, footer: { ...harbor.chrome.footer, address: "2 New St, Baltimore, MD 21202" } },
    };
    const [r] = await publishPackages(await compileAll(welcome, [moved]), apiFor);
    const footer = r.actions.find((a) => a.name === "es_harbor_footer")!;
    expect(footer.action).toBe("updated");
    expect(footer.note).toMatch(/Live change/);
    expect(r.actions.find((a) => a.kind === "email_template")!.action).toBe("unchanged");
  });

  it("skips a brand with validation errors and publishes nothing for it", async () => {
    const { transports, apiFor } = dryRunWorkspaces();
    const [r] = await publishPackages(await compileAll(welcome, [getBrand("fresh")!]), apiFor);
    expect(r.ok).toBe(false);
    expect(r.actions).toEqual([expect.objectContaining({ action: "skipped" })]);
    const log = transports.get("na")!.state.log;
    expect(log.every((e) => e.method === "GET")).toBe(true);
  });
});

describe("DryRunTransport enforces documented Braze limits", () => {
  const api = () => new BrazeApi(new DryRunTransport("t"));

  it("rejects bodies over 400 KB, unknown tags and bad block names", async () => {
    const a = api();
    await expect(a.createEmailTemplate({ template_name: "x", subject: "s", body: "x".repeat(400 * 1024 + 1) })).rejects.toThrow(/400KB/);
    await expect(
      a.transport.request("POST", "/templates/email/create", { template_name: "x", subject: "s", body: "b", tags: ["promo"] }),
    ).rejects.toThrow(/tags could not be found/);
    await expect(a.createContentBlock({ name: "has space", content: "c" })).rejects.toBeInstanceOf(BrazeApiError);
    await expect(a.createContentBlock({ name: "big", content: "x".repeat(50 * 1024) })).rejects.toThrow(/50KB/);
  });

  it("rejects duplicate Content Block names and empty updates", async () => {
    const a = api();
    await a.createContentBlock({ name: "footer", content: "c" });
    await expect(a.createContentBlock({ name: "footer", content: "d" })).rejects.toThrow(/already exists/);
    const { email_template_id } = await a.createEmailTemplate({ template_name: "x", subject: "s", body: "b" });
    await expect(a.updateEmailTemplate(email_template_id, {})).rejects.toThrow(/at least one field/);
  });
});

describe("HttpTransport (live path) request shape", () => {
  it("sends bearer auth, JSON bodies for POST and query strings for GET", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchMock = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ templates: [], email_template_id: "id-1", message: "success" }), {
        status: 200,
      });
    }) as unknown as typeof fetch;
    const api = new BrazeApi(new HttpTransport("na", "https://rest.iad-01.braze.com/", "key-123", fetchMock));

    await api.listEmailTemplates();
    await api.createEmailTemplate({ template_name: "[harbor] welcome", subject: "Hi", body: "<p>x</p>" });

    expect(calls[0].url).toBe("https://rest.iad-01.braze.com/templates/email/list?limit=1000&offset=0");
    expect(calls[0].init.method).toBe("GET");
    expect((calls[1].init.headers as Record<string, string>).authorization).toBe("Bearer key-123");
    expect(JSON.parse(calls[1].init.body as string)).toEqual({
      template_name: "[harbor] welcome",
      subject: "Hi",
      body: "<p>x</p>",
    });
  });

  it("surfaces Braze error messages", async () => {
    const fetchMock = (async () =>
      new Response(JSON.stringify({ message: "Invalid API key" }), { status: 401 })) as unknown as typeof fetch;
    const api = new BrazeApi(new HttpTransport("na", "https://rest.iad-01.braze.com", "bad", fetchMock));
    await expect(api.listContentBlocks()).rejects.toThrow("Invalid API key");
  });
});

describe("staging and promotion", () => {
  it("stages under suffixed names, then promotes exactly what was staged", async () => {
    const { transports, apiFor } = dryRunWorkspaces();
    const harbor = getBrand("harbor")!;
    const staged = await compileForBrand(welcome, harbor, "welcome", { stage: "staging" });
    expect(staged.template.template_name).toBe("[harbor] welcome (staging)");
    expect(staged.template.body).toContain("{{content_blocks.${es_harbor_footer__staging}}}");
    await publishPackages([staged], apiFor);

    const promoted = await stagedPackage(apiFor("na"), harbor, "welcome");
    expect(promoted.template.template_name).toBe("[harbor] welcome");
    expect(promoted.template.body).toContain("{{content_blocks.${es_harbor_footer}}}");
    expect(promoted.template.body).not.toContain("__staging");
    expect(promoted.contentBlocks.map((b) => b.name)).toEqual(["es_harbor_header", "es_harbor_footer"]);

    const [r] = await publishPackages([promoted], apiFor);
    expect(r.ok).toBe(true);
    const names = Object.values(transports.get("na")!.state.contentBlocks).map((b) => b.name).sort();
    expect(names).toEqual(["es_harbor_footer", "es_harbor_footer__staging", "es_harbor_header", "es_harbor_header__staging"]);
    // Production equals a direct production compile of the same doc.
    const direct = await compileForBrand(welcome, harbor, "welcome");
    expect(promoted.template.body).toBe(direct.template.body);
  });

  it("refuses to promote a brand with nothing staged", async () => {
    const { apiFor } = dryRunWorkspaces();
    await expect(stagedPackage(apiFor("na"), getBrand("harbor")!, "welcome")).rejects.toThrow(/Nothing staged/);
  });
});

describe("live brand styles (experimental)", () => {
  it("references Liquid variables instead of baked colors, and previews correctly", async () => {
    const harbor = getBrand("harbor")!;
    const pkg = await compileForBrand(welcome, harbor, "welcome", { liveStyles: true });
    expect(pkg.template.body.startsWith("{{content_blocks.${es_harbor_style}}}")).toBe(true);
    expect(pkg.template.body).toContain("{{es_brand}}");
    expect(pkg.template.body).not.toContain("#0e7490");
    const style = pkg.contentBlocks[0];
    expect(style.name).toBe("es_harbor_style");
    expect(style.content).toContain("{% assign es_brand = '#0e7490' %}");
    expect(style.content).toContain("&quot;Inter&quot;"); // attribute-safe font stack
    expect(validatePackage(pkg).map((i) => i.code)).not.toContain("liquid-bare-name");

    const preview = previewPackage(pkg, {}).html;
    expect(preview).toContain("#0e7490");
    expect(preview).not.toContain("{{es_");
  });

  it("a brand color change updates only the stylesheet block", async () => {
    const { apiFor } = dryRunWorkspaces();
    const harbor = getBrand("harbor")!;
    await publishPackages([await compileForBrand(welcome, harbor, "welcome", { liveStyles: true })], apiFor);
    const recolored: Brand = { ...harbor, theme: { ...harbor.theme, brand: "#be123c" } };
    const [r] = await publishPackages([await compileForBrand(welcome, recolored, "welcome", { liveStyles: true })], apiFor);
    expect(r.actions.map((a) => `${a.name}:${a.action}`)).toEqual([
      "es_harbor_style:updated",
      "es_harbor_header:unchanged",
      "es_harbor_footer:unchanged",
      "[harbor] welcome:unchanged",
    ]);
  });
});

describe("connection check", () => {
  it("reports a missing permission without publishing anything", async () => {
    const t = new DryRunTransport("na", undefined, undefined, ["content_blocks.update"]);
    const checks = await checkConnection(new BrazeApi(t), { write: true });
    const status = Object.fromEntries(checks.map((c) => [c.permission, c.status]));
    expect(status["templates.email.list"]).toBe("ok");
    expect(status["content_blocks.create"]).toBe("ok");
    expect(status["content_blocks.update"]).toBe("missing");
    expect(status["templates.email.create"]).toBe("untested");
    expect(Object.values(t.state.templates)).toHaveLength(0);
  });
});

describe("HttpTransport retries", () => {
  function scripted(statuses: number[], headers: Record<string, string> = {}) {
    const calls: RequestInit[] = [];
    const fetchMock = (async (_url: string, init: RequestInit) => {
      calls.push(init);
      const status = statuses[Math.min(calls.length - 1, statuses.length - 1)];
      return new Response(JSON.stringify(status === 200 ? { templates: [], email_template_id: "x" } : { message: "nope" }), {
        status,
        headers,
      });
    }) as unknown as typeof fetch;
    const sleeps: number[] = [];
    const t = new HttpTransport("na", "https://rest.iad-01.braze.com", "k", fetchMock, {
      sleep: async (ms) => void sleeps.push(ms),
    });
    return { api: new BrazeApi(t), calls, sleeps };
  }

  it("retries 429s honoring Retry-After and tags requests", async () => {
    const { api, calls, sleeps } = scripted([429, 429, 200], { "retry-after": "2" });
    await api.listEmailTemplates();
    expect(calls).toHaveLength(3);
    expect(sleeps).toEqual([2000, 2000]);
    expect((calls[0].headers as Record<string, string>)["user-agent"]).toBe("email-studio-builder");
  });

  it("retries 5xx on reads but never on creates", async () => {
    const read = scripted([503, 200]);
    await read.api.listEmailTemplates();
    expect(read.calls).toHaveLength(2);

    const create = scripted([503, 200]);
    await expect(create.api.createEmailTemplate({ template_name: "t", subject: "s", body: "b" })).rejects.toThrow();
    expect(create.calls).toHaveLength(1);
  });
});
