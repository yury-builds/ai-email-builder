import { describe, expect, it } from "vitest";
import { protectLiquid, renderLiquidPreview, restoreLiquid } from "@/lib/liquid";
import { renderEmailHtml } from "@/lib/render";
import type { EmailDoc } from "@/lib/types";

const tricky = `Hi {{\${first_name} | default: "there"}}, {% if custom_attribute.\${tier} == 'gold' %}VIP{% endif %}`;

function docWith(body: string, href = "https://x.com/?u={{${user_id}}}&src=email"): EmailDoc {
  return {
    subject: "s",
    preheader: "",
    data: {
      root: { props: { theme: "trust" } },
      content: [
        { type: "EmailText", props: { id: "t", body, alignment: "left", emphasis: "normal" } },
        { type: "EmailButton", props: { id: "b", label: "Go", href, alignment: "center", color: "", textColor: "" } },
      ],
    } as EmailDoc["data"],
  };
}

describe("Liquid protection through react.email rendering", () => {
  it("unprotected rendering escapes quotes inside Liquid (the bug being guarded against)", async () => {
    const html = await renderEmailHtml(docWith(tricky));
    expect(html).toContain("default: &quot;there&quot;");
  });

  it("protect/restore keeps Liquid byte-for-byte in text and attributes", async () => {
    const vault: string[] = [];
    const html = restoreLiquid(await renderEmailHtml(protectLiquid(docWith(tricky), vault)), vault);
    expect(html).toContain(tricky);
    expect(html).toContain('href="https://x.com/?u={{${user_id}}}&amp;src=email"');
  });
});

describe("renderLiquidPreview", () => {
  const ctx = {
    attributes: { first_name: "Ava" },
    customAttributes: { tier: "Gold" },
    contentBlocks: {
      a: "A[{{content_blocks.${b}}}]",
      b: "B[{{content_blocks.${c}}}]",
      c: "C",
    },
  };

  it("resolves attributes, custom attributes and filters", () => {
    expect(renderLiquidPreview("{{${first_name}}} / {{custom_attribute.${tier} | upcase}}", ctx).output).toBe("Ava / GOLD");
    expect(renderLiquidPreview(`{{\${last_name} | default: "friend"}}`, ctx).output).toBe("friend");
  });

  it("renders bare names empty like Braze does", () => {
    expect(renderLiquidPreview("Hi {{first_name}}!", ctx).output).toBe("Hi !");
  });

  it("expands Content Blocks nested once, not twice", () => {
    const r = renderLiquidPreview("{{content_blocks.${a}}}", ctx);
    expect(r.output).toBe("A[B[]]");
    expect(r.unsupported.join()).toContain("nested deeper");
  });

  it("reports control-flow tags instead of guessing", () => {
    const r = renderLiquidPreview("{% if x %}y{% endif %}", ctx);
    expect(r.unsupported).toEqual(["{% if x %}", "{% endif %}"]);
  });
});

describe("assign", () => {
  it("makes variables assigned in a Content Block visible after it", () => {
    const r = renderLiquidPreview("{{content_blocks.${s}}}<p style=\"color:{{es_brand}}\">", {
      attributes: {},
      contentBlocks: { s: "{% assign es_brand = '#123456' %}" },
    });
    expect(r.output).toBe('<p style="color:#123456">');
    expect(r.unsupported).toEqual([]);
  });
});
