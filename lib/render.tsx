import * as React from "react";
import { render } from "@react-email/render";
import { Body, Container, Head, Html, Preview } from "@react-email/components";
import { blockRenderers } from "./blocks";
import { getTheme } from "./themes";
import { ThemeContext } from "./theme-context";
import type { EmailDoc } from "./types";
import { applyVarsToDoc } from "./vars";

type RenderOpts = { dark?: boolean };

export function buildEmailTree(input: EmailDoc, opts: RenderOpts = {}): React.ReactElement {
  const doc = applyVarsToDoc(input);
  const rootProps = (doc.data.root?.props ?? {}) as { theme?: string };
  const theme = getTheme(rootProps.theme);

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
              const Renderer = blockRenderers[item.type];
              if (!Renderer) return null;
              const key = (item.props?.id as string) ?? `${item.type}-${idx}`;
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

export async function renderEmailText(doc: EmailDoc): Promise<string> {
  const tree = buildEmailTree(doc);
  return await render(tree, { plainText: true });
}
