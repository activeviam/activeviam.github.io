import React, { createContext, useContext, useRef } from "react";
import { requireNonNull } from "../library/utilities/util";

interface OverlayContainerContext {
  getContainer(): HTMLDivElement | null;
}

const ctx = createContext<OverlayContainerContext | null>(null);

function useOverlayContainerContext() {
  return useContext(ctx);
}

/**
 * This hook is used for providing a target for react-bootstrap Overlay
 * component. It is useful when Overlay is inside an SVG.
 */
export function useOverlayContainer() {
  return requireNonNull(useOverlayContainerContext()).getContainer();
}

/**
 * This React component is used as a wrapper. It provides a target for
 * react-bootstrap Overlay component.
 */
export function OverlayContainer({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <ctx.Provider value={{ getContainer: () => ref.current }}>
      {children}
      <div
        ref={ref}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      ></div>
    </ctx.Provider>
  );
}
