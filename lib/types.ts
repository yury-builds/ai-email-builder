import type {
  Data as PuckData,
  DefaultComponents,
  DefaultRootFieldProps,
} from "@puckeditor/core";

export type EmailRootProps = {
  // Optional: legacy docs without an explicit theme fall back to the default theme
  // (resolved by `getTheme(undefined)` in lib/themes.ts).
  theme?: string;
};

export type EmailDocRootProps = EmailRootProps & DefaultRootFieldProps;

export type EmailDoc = {
  subject: string;
  preheader: string;
  data: PuckData<DefaultComponents, EmailDocRootProps>;
  vars?: Record<string, string>;
};

export type PreviewVariant = "desktop" | "mobile" | "dark";

export type PlannerOp =
  | { kind: "add_block"; type: string; props?: Record<string, unknown>; index?: number }
  | { kind: "update_props"; id: string; props: Record<string, unknown> }
  | { kind: "move_block"; id: string; toIndex: number }
  | { kind: "remove_block"; id: string }
  | { kind: "update_meta"; subject?: string; preheader?: string; theme?: string };

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  ops?: PlannerOp[];
  opLabels?: string[];
  at: number;
};
