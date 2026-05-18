"use client";

import * as React from "react";
import {
  Puck,
  blocksPlugin,
  fieldsPlugin,
  outlinePlugin,
  type Data,
  type Plugin,
  type Viewports,
} from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { puckConfig } from "@/lib/blocks";
import type { EmailDocRootProps } from "@/lib/types";
import { PuckDispatchBridge, type PuckDispatchFn } from "./PuckDispatchBridge";

import type { DefaultComponents } from "@puckeditor/core";

type PuckData = Data<DefaultComponents, EmailDocRootProps>;

export function EmailCanvas({
  data,
  onChange,
  highlightedId,
  chatPlugin,
  remoteVersion,
  dispatchRef,
}: {
  data: PuckData;
  onChange: (data: PuckData) => void;
  highlightedId?: string | null;
  chatPlugin?: Plugin;
  remoteVersion?: number;
  dispatchRef?: React.MutableRefObject<PuckDispatchFn | null>;
}) {
  const plugins = React.useMemo<Plugin[]>(
    () => [
      ...(chatPlugin ? [chatPlugin] : []),
      blocksPlugin(),
      outlinePlugin(),
      fieldsPlugin(),
    ],
    [chatPlugin],
  );

  const overrides = React.useMemo(
    () => ({
      headerActions: () =>
        dispatchRef ? <PuckDispatchBridge dispatchRef={dispatchRef} /> : <></>,
    }),
    [dispatchRef],
  );

  const viewports = React.useMemo<Viewports>(
    () => [
      { width: 390, height: 720, icon: "Smartphone", label: "Mobile" },
      { width: 768, height: 900, icon: "Tablet", label: "Tablet" },
      { width: 1280, height: 900, icon: "Monitor", label: "Desktop" },
      // "FullWidth" is in Puck's runtime icon map (Expand icon) but missing from the
      // public iconTypes union — cast through unknown to use it.
      { width: "100%", height: 900, icon: "FullWidth" as unknown as "Monitor", label: "Full width" },
    ],
    [],
  );

  return (
    <div className="h-full email-canvas-host" data-highlight={highlightedId ?? ""}>
      <Puck
        key={`puck-${remoteVersion ?? 0}`}
        config={puckConfig}
        data={data}
        onChange={onChange}
        onPublish={() => {}}
        iframe={{ enabled: true }}
        plugins={plugins}
        viewports={viewports}
        overrides={overrides}
      />
      <style>{`
        .email-canvas-host [data-rfd-draggable-id="${highlightedId ?? "__none__"}"] {
          outline: 2px solid #6366f1;
          outline-offset: 4px;
          transition: outline-color 1.2s ease;
        }
      `}</style>
    </div>
  );
}
