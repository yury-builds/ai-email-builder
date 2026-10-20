import * as React from "react";
import { render } from "@react-email/render";
import { Body, Container, Head, Html, Preview } from "@react-email/components";
import { blockRenderers } from "./blocks";
import { getTheme, type Theme } from "./themes";
import { ThemeContext } from "./theme-context";
import type { EmailDoc } from "./types";
import { applyVarsToDoc } from "./vars";

type RenderOpts = { dark?: boolean; /** Overrides the doc's theme (e.g. Liquid-variable tokens). */ theme?: Theme };

/** Internal block type: emits its `liquid` prop verbatim in place of a block (not in Puck). */
export const RAW_LIQUID_BLOCK = "__RawLiquid";

export function buildEmailTree(input: EmailDoc, opts: RenderOpts = {}): React.ReactElement {
  const doc = applyVarsToDoc(input);
  const rootProps = (doc.data.root?.props ?? {}) as { theme?: string };
  const theme = opts.theme ?? getTheme(rootProps.theme);

  const bg = opts.dark ? "#0f172a" : theme.canvas;
  const cardBg = opts.dark ? "#1e293b" : theme.surface;

  const items = (doc.data.content ?? []) as { type: string; props: Record<string, unknown> }[];

  return (
    <Html lang="en">
      <Head />
      {doc.preheader ? <Preview>{doc.preheader}</Preview> : null}
      <Body
        style={{
          background: bg,
          margin: 0,
          padding: "32px 0",
          fontFamily: theme.fontBody,
        }}
      >
        <ThemeContext.Provider value={theme}>
          <Container
            style={{
              background: cardBg,
              maxWidth: 600,
              margin: "0 auto",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: opts.dark ? "none" : "0 1px 2px rgba(15,23,42,0.06)",
            }}
          >
            {items.map((item, idx) => {
              const key = (item.props?.id as string) ?? `${item.type}-${idx}`;
              if (item.type === RAW_LIQUID_BLOCK) return <React.Fragment key={key}>{item.props.liquid as string}</React.Fragment>;
              const Renderer = blockRenderers[item.type];
              if (!Renderer) return null;
              return <Renderer key={key} {...item.props} />;
            })}
          </Container>
        </ThemeContext.Provider>
      </Body>
    </Html>
  );
}

export async function renderEmailHtml(doc: EmailDoc, opts: RenderOpts = {}): Promise<string> {
  const tree = buildEmailTree(doc, opts);
  return await render(tree, { pretty: false });
}

export async function renderEmailText(doc: EmailDoc, opts: RenderOpts = {}): Promise<string> {
  const tree = buildEmailTree(doc, opts);
  return await render(tree, { plainText: true });
}

/** One block's markup on its own (no html/head/body), e.g. for a Braze Content Block. */
export async function renderBlockHtml(type: string, props: Record<string, unknown>, theme: Theme): Promise<string> {
  const Renderer = blockRenderers[type];
  if (!Renderer) throw new Error(`Unknown block type ${type}`);
  const html = await render(
    <ThemeContext.Provider value={theme}>
      <Renderer {...props} />
    </ThemeContext.Provider>,
    { pretty: false },
  );
  return html.replace(/^<!DOCTYPE[^>]*>/i, "").replace(/<!--\/?\$-->/g, "");
}
