"use client";

import * as React from "react";
import type { Config, Fields } from "@puckeditor/core";
import {
  Button as EButton,
  Column as EColumn,
  Container as EContainer,
  Heading as EHeading,
  Hr as EHr,
  Img as EImg,
  Link as ELink,
  Row as ERow,
  Section as ESection,
  Text as EText,
} from "@react-email/components";
import { getTheme, themeOptions, type Theme } from "./themes";
import { ThemeContext, useTheme } from "./theme-context";
import type { EmailRootProps } from "./types";

function baseSection(theme: Theme, extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    paddingTop: theme.sectionPadding,
    paddingBottom: theme.sectionPadding,
    paddingLeft: 32,
    paddingRight: 32,
    ...extra,
  };
}

function makeTextBase(theme: Theme): React.CSSProperties {
  return {
    fontFamily: theme.fontBody,
    color: theme.body,
    fontSize: "16px",
    lineHeight: "24px",
    margin: 0,
  };
}

// ─── Block prop types ──────────────────────────────────────────────────────────

export type EmailHeaderProps = {
  logoUrl: string;
  logoAlt: string;
  logoWidth: number;
  alignment: "left" | "center" | "right";
};

export type EmailHeroProps = {
  heading: string;
  subhead: string;
  imageUrl: string;
  imageAlt: string;
  alignment: "left" | "center";
};

export type EmailTextProps = {
  body: string;
  alignment: "left" | "center" | "right";
  emphasis: "normal" | "muted" | "strong";
};

export type EmailButtonProps = {
  label: string;
  href: string;
  alignment: "left" | "center" | "right";
  color: string;
  textColor: string;
};

export type EmailImageProps = {
  src: string;
  alt: string;
  width: number;
  href: string;
};

export type EmailDividerProps = {
  spacing: "tight" | "default" | "loose";
};

export type EmailColumnsProps = {
  leftImageUrl: string;
  leftImageAlt: string;
  leftHeading: string;
  leftBody: string;
  rightImageUrl: string;
  rightImageAlt: string;
  rightHeading: string;
  rightBody: string;
};

export type EmailFooterProps = {
  companyName: string;
  address: string;
  unsubscribeUrl: string;
  socialLinks: { label: string; href: string }[];
};

export type EmailCodeBlockProps = {
  label: string;
  code: string;
};

// ─── Block renderers ───────────────────────────────────────────────────────────

function EmailHeader(props: EmailHeaderProps): React.ReactElement {
  const theme = useTheme();
  const logoUrl = props.logoUrl || theme.logo;
  const logoAlt = props.logoAlt || theme.logoAlt;
  return (
    <ESection style={baseSection(theme, { textAlign: props.alignment })}>
      <EImg src={logoUrl} alt={logoAlt} width={props.logoWidth} style={{ display: "inline-block" }} />
    </ESection>
  );
}

function EmailHero(props: EmailHeroProps): React.ReactElement {
  const theme = useTheme();
  const textBase = makeTextBase(theme);
  return (
    <ESection style={baseSection(theme, { textAlign: props.alignment, paddingBottom: 12 })}>
      {props.imageUrl ? (
        <EImg
          src={props.imageUrl}
          alt={props.imageAlt}
          width="540"
          style={{ width: "100%", borderRadius: theme.imageRadius, marginBottom: 24 }}
        />
      ) : null}
      <EHeading
        as="h1"
        style={{
          ...textBase,
          fontFamily: theme.fontHeading,
          color: theme.heading,
          fontSize: 30,
          lineHeight: "36px",
          fontWeight: 700,
          margin: 0,
        }}
      >
        {props.heading}
      </EHeading>
      {props.subhead ? (
        <EText style={{ ...textBase, color: theme.muted, fontSize: 16, marginTop: 12 }}>{props.subhead}</EText>
      ) : null}
    </ESection>
  );
}

function EmailText(props: EmailTextProps): React.ReactElement {
  const theme = useTheme();
  const textBase = makeTextBase(theme);
  const color =
    props.emphasis === "muted" ? theme.muted : props.emphasis === "strong" ? theme.heading : theme.body;
  const weight = props.emphasis === "strong" ? 600 : 400;
  return (
    <ESection style={baseSection(theme, { paddingTop: 8, paddingBottom: 8 })}>
      <EText style={{ ...textBase, color, fontWeight: weight, textAlign: props.alignment }}>{props.body}</EText>
    </ESection>
  );
}

function EmailButton(props: EmailButtonProps): React.ReactElement {
  const theme = useTheme();
  const bg = props.color || theme.brand;
  const fg = props.textColor || theme.brandFg;
  return (
    <ESection style={baseSection(theme, { textAlign: props.alignment, paddingTop: 16, paddingBottom: 16 })}>
      <EButton
        href={props.href}
        style={{
          background: bg,
          color: fg,
          padding: "12px 24px",
          borderRadius: theme.buttonRadius,
          fontWeight: theme.buttonWeight,
          fontSize: 16,
          textDecoration: "none",
          display: "inline-block",
          fontFamily: theme.fontBody,
          textTransform: theme.buttonCase === "upper" ? "uppercase" : "none",
          letterSpacing: theme.buttonCase === "upper" ? "0.06em" : "normal",
        }}
      >
        {props.label}
      </EButton>
    </ESection>
  );
}

function EmailImage(props: EmailImageProps): React.ReactElement {
  const theme = useTheme();
  const img = (
    <EImg src={props.src} alt={props.alt} width={props.width} style={{ width: "100%", borderRadius: theme.imageRadius }} />
  );
  return (
    <ESection style={baseSection(theme, { paddingTop: 8, paddingBottom: 8 })}>
      {props.href ? <ELink href={props.href}>{img}</ELink> : img}
    </ESection>
  );
}

function EmailDivider(props: EmailDividerProps): React.ReactElement {
  const theme = useTheme();
  const pad = props.spacing === "tight" ? 8 : props.spacing === "loose" ? 32 : 16;
  return (
    <ESection style={baseSection(theme, { paddingTop: pad, paddingBottom: pad })}>
      <EHr style={{ borderColor: theme.border, borderTop: `1px solid ${theme.border}`, margin: 0 }} />
    </ESection>
  );
}

function EmailColumns(props: EmailColumnsProps): React.ReactElement {
  const theme = useTheme();
  const textBase = makeTextBase(theme);
  const headingStyle: React.CSSProperties = {
    ...textBase,
    fontFamily: theme.fontHeading,
    color: theme.heading,
    fontSize: 18,
    fontWeight: 600,
    margin: "0 0 8px",
  };
  return (
    <ESection style={baseSection(theme, { paddingTop: 16, paddingBottom: 16 })}>
      <ERow style={{ tableLayout: "fixed" }}>
        <EColumn width="50%" style={{ width: "50%", paddingRight: 12, verticalAlign: "top" }}>
          {props.leftImageUrl ? (
            <EImg
              src={props.leftImageUrl}
              alt={props.leftImageAlt}
              width="276"
              style={{
                width: "100%",
                borderRadius: theme.imageRadius,
                marginBottom: props.leftHeading || props.leftBody ? 12 : 0,
              }}
            />
          ) : null}
          {props.leftHeading ? <EHeading as="h3" style={headingStyle}>{props.leftHeading}</EHeading> : null}
          {props.leftBody ? <EText style={textBase}>{props.leftBody}</EText> : null}
        </EColumn>
        <EColumn width="50%" style={{ width: "50%", paddingLeft: 12, verticalAlign: "top" }}>
          {props.rightImageUrl ? (
            <EImg
              src={props.rightImageUrl}
              alt={props.rightImageAlt}
              width="276"
              style={{
                width: "100%",
                borderRadius: theme.imageRadius,
                marginBottom: props.rightHeading || props.rightBody ? 12 : 0,
              }}
            />
          ) : null}
          {props.rightHeading ? <EHeading as="h3" style={headingStyle}>{props.rightHeading}</EHeading> : null}
          {props.rightBody ? <EText style={textBase}>{props.rightBody}</EText> : null}
        </EColumn>
      </ERow>
    </ESection>
  );
}

function EmailFooter(props: EmailFooterProps): React.ReactElement {
  const theme = useTheme();
  const textBase = makeTextBase(theme);
  return (
    <ESection style={baseSection(theme, { background: theme.footerBg, paddingTop: 32, paddingBottom: 32 })}>
      {props.socialLinks && props.socialLinks.length > 0 ? (
        <EText style={{ ...textBase, color: theme.footerInk, fontSize: 14, textAlign: "center", margin: "0 0 12px" }}>
          {props.socialLinks.map((s, i) => (
            <React.Fragment key={`${s.href ?? "link"}-${i}`}>
              {i > 0 ? " · " : null}
              <ELink href={s.href} style={{ color: theme.footerInk }}>
                {s.label}
              </ELink>
            </React.Fragment>
          ))}
        </EText>
      ) : null}
      <EText style={{ ...textBase, color: theme.footerInk, fontSize: 12, textAlign: "center", margin: 0 }}>
        {props.companyName} · {props.address}
      </EText>
      {props.unsubscribeUrl ? (
        <EText style={{ ...textBase, color: theme.footerInk, fontSize: 12, textAlign: "center", margin: "8px 0 0" }}>
          <ELink href={props.unsubscribeUrl} style={{ color: theme.footerInk }}>
            Unsubscribe
          </ELink>
        </EText>
      ) : null}
    </ESection>
  );
}

function EmailCodeBlock(props: EmailCodeBlockProps): React.ReactElement {
  const theme = useTheme();
  const textBase = makeTextBase(theme);
  return (
    <ESection style={baseSection(theme, { paddingTop: 8, paddingBottom: 8 })}>
      {props.label ? (
        <EText style={{ ...textBase, color: theme.muted, fontSize: 13, margin: "0 0 8px" }}>{props.label}</EText>
      ) : null}
      <EText
        style={{
          ...textBase,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          background: theme.canvas,
          color: theme.heading,
          padding: "16px 20px",
          borderRadius: theme.imageRadius,
          border: `1px solid ${theme.border}`,
          letterSpacing: "0.05em",
          textAlign: "center",
          fontSize: 20,
          fontWeight: 600,
        }}
      >
        {props.code}
      </EText>
    </ESection>
  );
}

// ─── Puck config ───────────────────────────────────────────────────────────────

const align3 = {
  type: "select",
  options: [
    { label: "Left", value: "left" },
    { label: "Center", value: "center" },
    { label: "Right", value: "right" },
  ],
} as const;
const align2 = {
  type: "select",
  options: [
    { label: "Left", value: "left" },
    { label: "Center", value: "center" },
  ],
} as const;

const headerFields: Fields<EmailHeaderProps> = {
  logoUrl: { type: "text", label: "Logo URL · 120×40 (leave empty to use theme logo)" },
  logoAlt: { type: "text", label: "Logo alt text" },
  logoWidth: { type: "number", label: "Logo width (px)" },
  alignment: align3 as Fields<EmailHeaderProps>["alignment"],
};

const heroFields: Fields<EmailHeroProps> = {
  heading: { type: "text" },
  subhead: { type: "textarea" },
  imageUrl: { type: "text", label: "Hero image URL · 600×300 (2:1)" },
  imageAlt: { type: "text" },
  alignment: align2 as Fields<EmailHeroProps>["alignment"],
};

const textFields: Fields<EmailTextProps> = {
  body: { type: "textarea" },
  alignment: align3 as Fields<EmailTextProps>["alignment"],
  emphasis: {
    type: "select",
    options: [
      { label: "Normal", value: "normal" },
      { label: "Muted", value: "muted" },
      { label: "Strong", value: "strong" },
    ],
  },
};

const buttonFields: Fields<EmailButtonProps> = {
  label: { type: "text" },
  href: { type: "text" },
  alignment: align3 as Fields<EmailButtonProps>["alignment"],
  color: { type: "text", label: "Background (leave empty for theme brand color)" },
  textColor: { type: "text", label: "Text color (leave empty for theme)" },
};

const imageFields: Fields<EmailImageProps> = {
  src: { type: "text", label: "Image URL" },
  alt: { type: "text" },
  width: { type: "number" },
  href: { type: "text", label: "Click target (optional)" },
};

const dividerFields: Fields<EmailDividerProps> = {
  spacing: {
    type: "select",
    options: [
      { label: "Tight", value: "tight" },
      { label: "Default", value: "default" },
      { label: "Loose", value: "loose" },
    ],
  },
};

const columnsFields: Fields<EmailColumnsProps> = {
  leftImageUrl: { type: "text", label: "Left image URL · 300×200 (3:2)" },
  leftImageAlt: { type: "text" },
  leftHeading: { type: "text" },
  leftBody: { type: "textarea" },
  rightImageUrl: { type: "text", label: "Right image URL · 300×200 (3:2)" },
  rightImageAlt: { type: "text" },
  rightHeading: { type: "text" },
  rightBody: { type: "textarea" },
};

const footerFields: Fields<EmailFooterProps> = {
  companyName: { type: "text" },
  address: { type: "text" },
  unsubscribeUrl: { type: "text" },
  socialLinks: {
    type: "array",
    arrayFields: {
      label: { type: "text" },
      href: { type: "text" },
    },
    defaultItemProps: { label: "Twitter", href: "https://twitter.com" },
  },
};

const codeFields: Fields<EmailCodeBlockProps> = {
  label: { type: "text" },
  code: { type: "text" },
};

const rootFields: Fields<EmailRootProps> = {
  theme: {
    type: "select",
    label: "Brand theme",
    options: themeOptions,
  },
};

export type EmailBlocks = {
  EmailHeader: EmailHeaderProps;
  EmailHero: EmailHeroProps;
  EmailText: EmailTextProps;
  EmailButton: EmailButtonProps;
  EmailImage: EmailImageProps;
  EmailDivider: EmailDividerProps;
  EmailColumns: EmailColumnsProps;
  EmailFooter: EmailFooterProps;
  EmailCodeBlock: EmailCodeBlockProps;
};

// Reset Tailwind preflight (which Puck copies into its iframe from the host stylesheets)
// inside the email rendering area, so the canvas matches `@react-email/render` output —
// which runs in a pristine iframe srcDoc with zero external CSS.
const emailResetCss = `
  html, body { margin: 0; padding: 0; height: 100%; }
  .email-rendering, .email-rendering *, .email-rendering *::before, .email-rendering *::after {
    box-sizing: border-box;
    border-width: 0;
    border-style: solid;
  }
  .email-rendering h1 { font-size: 2em; margin: 0.67em 0; font-weight: bold; }
  .email-rendering h2 { font-size: 1.5em; margin: 0.83em 0; font-weight: bold; }
  .email-rendering h3 { font-size: 1.17em; margin: 1em 0; font-weight: bold; }
  .email-rendering h4 { font-size: 1em; margin: 1.33em 0; font-weight: bold; }
  .email-rendering h5 { font-size: 0.83em; margin: 1.67em 0; font-weight: bold; }
  .email-rendering h6 { font-size: 0.67em; margin: 2.33em 0; font-weight: bold; }
  .email-rendering p { margin: 1em 0; }
  .email-rendering b, .email-rendering strong { font-weight: bolder; }
  .email-rendering a { color: inherit; text-decoration: underline; }
  .email-rendering img { max-width: 100%; height: auto; display: block; border-style: none; }
  .email-rendering hr { box-sizing: content-box; height: 0; overflow: visible; }
  .email-rendering table { border-collapse: separate; border-spacing: 0; text-indent: 0; }
  .email-rendering td, .email-rendering th { padding: 0; vertical-align: top; }
  .email-rendering ul, .email-rendering ol { margin: 1em 0; padding-left: 40px; }
`;

function EmailRoot({
  children,
  theme: themeId,
}: {
  children?: React.ReactNode;
  theme?: string;
}): React.ReactElement {
  const theme = getTheme(themeId);
  const themeCss = `html, body { background: ${theme.canvas}; }`;
  return (
    <ThemeContext.Provider value={theme}>
      <style dangerouslySetInnerHTML={{ __html: emailResetCss }} />
      <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      <div
        className="email-rendering"
        style={{
          background: theme.canvas,
          padding: "32px 0",
          minHeight: "100vh",
          width: "100%",
          boxSizing: "border-box",
          margin: 0,
          fontFamily: theme.fontBody,
        }}
      >
        <EContainer
          style={{
            background: theme.surface,
            maxWidth: 600,
            margin: "0 auto",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 1px 2px rgba(15,23,42,0.06)",
          }}
        >
          {children}
        </EContainer>
      </div>
    </ThemeContext.Provider>
  );
}

export const puckConfig: Config<EmailBlocks, EmailRootProps> = {
  root: {
    fields: rootFields,
    defaultProps: { theme: "fresh" },
    render: EmailRoot as Config<EmailBlocks, EmailRootProps>["root"] extends { render?: infer Fn } ? Fn : never,
  },
  components: {
    EmailHeader: {
      fields: headerFields,
      defaultProps: { logoUrl: "", logoAlt: "", logoWidth: 120, alignment: "center" },
      render: EmailHeader,
    },
    EmailHero: {
      fields: heroFields,
      defaultProps: {
        heading: "Welcome aboard",
        subhead: "We're thrilled to have you. Here's everything you need to get started.",
        imageUrl: "",
        imageAlt: "",
        alignment: "left",
      },
      render: EmailHero,
    },
    EmailText: {
      fields: textFields,
      defaultProps: {
        body: "Write your message here. Keep it short — most readers skim emails on their phone.",
        alignment: "left",
        emphasis: "normal",
      },
      render: EmailText,
    },
    EmailButton: {
      fields: buttonFields,
      defaultProps: { label: "Get started", href: "https://example.com", alignment: "center", color: "", textColor: "" },
      render: EmailButton,
    },
    EmailImage: {
      fields: imageFields,
      defaultProps: { src: "https://placehold.co/600x300", alt: "Image", width: 540, href: "" },
      render: EmailImage,
    },
    EmailDivider: {
      fields: dividerFields,
      defaultProps: { spacing: "default" },
      render: EmailDivider,
    },
    EmailColumns: {
      fields: columnsFields,
      defaultProps: {
        leftImageUrl: "",
        leftImageAlt: "",
        leftHeading: "Fast",
        leftBody: "Set up in minutes with sensible defaults.",
        rightImageUrl: "",
        rightImageAlt: "",
        rightHeading: "Flexible",
        rightBody: "Customise every block to match your brand.",
      },
      render: EmailColumns,
    },
    EmailFooter: {
      fields: footerFields,
      defaultProps: {
        companyName: "Your company",
        address: "Street, City, Country",
        unsubscribeUrl: "https://example.com/unsubscribe",
        socialLinks: [{ label: "Instagram", href: "https://instagram.com" }],
      },
      render: EmailFooter,
    },
    EmailCodeBlock: {
      fields: codeFields,
      defaultProps: { label: "Your verification code", code: "284 913" },
      render: EmailCodeBlock,
    },
  },
};

export const blockTypeList = Object.keys(puckConfig.components) as (keyof EmailBlocks)[];

// ─── Renderer registry for non-Puck contexts (e.g. @react-email/render) ────────

type AnyRenderer = (props: Record<string, unknown>) => React.ReactElement;

export const blockRenderers: Record<string, AnyRenderer> = {
  EmailHeader: EmailHeader as unknown as AnyRenderer,
  EmailHero: EmailHero as unknown as AnyRenderer,
  EmailText: EmailText as unknown as AnyRenderer,
  EmailButton: EmailButton as unknown as AnyRenderer,
  EmailImage: EmailImage as unknown as AnyRenderer,
  EmailDivider: EmailDivider as unknown as AnyRenderer,
  EmailColumns: EmailColumns as unknown as AnyRenderer,
  EmailFooter: EmailFooter as unknown as AnyRenderer,
  EmailCodeBlock: EmailCodeBlock as unknown as AnyRenderer,
};
