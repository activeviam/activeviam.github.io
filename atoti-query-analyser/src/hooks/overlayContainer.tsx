import React, { createContext, useContext, useRef } from "react";
import { requireNonNull } from "../library/utilities/util";

interface OverlayContainerContext {
  getContainer(): HTMLDivElement | null;
}

const ctx = createContext<OverlayContainerContext | null>(null);

function useOverlayContainerContext() {
  return useContext(ctx);
}

export function useOverlayContainer() {
  return requireNonNull(useOverlayContainerContext()).getContainer();
}

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
          width: "100vw",
          height: "100vh",
          pointerEvents: "none",
        }}
      ></div>
    </ctx.Provider>
  );
}
