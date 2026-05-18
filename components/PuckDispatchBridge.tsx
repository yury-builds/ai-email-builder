"use client";

import * as React from "react";
import { useGetPuck } from "@puckeditor/core";

export type PuckDispatchFn = (action: { type: string; [k: string]: unknown }) => void;

export function PuckDispatchBridge({
  dispatchRef,
}: {
  dispatchRef: React.MutableRefObject<PuckDispatchFn | null>;
}) {
  const getPuck = useGetPuck();

  React.useEffect(() => {
    dispatchRef.current = (action) => {
      const puck = getPuck() as unknown as { dispatch: PuckDispatchFn };
      puck.dispatch(action);
    };
    return () => {
      dispatchRef.current = null;
    };
  }, [dispatchRef, getPuck]);

  return null;
}
