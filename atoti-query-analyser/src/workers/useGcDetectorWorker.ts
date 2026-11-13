import { useCallback, useEffect, useRef, useState } from "react";
import type { GcDetectionParams, TimingSample } from "../library/gcDetection/detectGcPauses";
import type {
  GcDetectorInputMessage,
  GcDetectorOutputMessage,
  GcDetectorState,
} from "./gcDetectorTypes";

const initialState: GcDetectorState = {
  isRunning: false,
  report: null,
  error: null,
};

export interface UseGcDetectorWorkerReturn {
  detect: (samples: TimingSample[], params?: GcDetectionParams) => void;
  state: GcDetectorState;
}

/**
 * Runs the GC detection in a dedicated web worker. The worker is only created
 * on the first detection, and terminated when the component unmounts.
 */
export function useGcDetectorWorker(): UseGcDetectorWorkerReturn {
  const [state, setState] = useState<GcDetectorState>(initialState);
  const workerRef = useRef<Worker | null>(null);

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    },
    [],
  );

  const getWorker = useCallback((): Worker => {
    if (workerRef.current) {
      return workerRef.current;
    }
    const worker = new Worker(new URL("./gcDetector.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event: MessageEvent<GcDetectorOutputMessage>) => {
      const message = event.data;
      if (message.type === "SUCCESS") {
        setState({
          isRunning: false,
          report: message.payload.report,
          error: null,
        });
      } else {
        setState({
          isRunning: false,
          report: null,
          error: message.payload.message,
        });
      }
    };
    worker.onerror = (event) => {
      setState({
        isRunning: false,
        report: null,
        error: event.message || "GC detection worker error",
      });
    };
    workerRef.current = worker;
    return worker;
  }, []);

  const detect = useCallback(
    (samples: TimingSample[], params?: GcDetectionParams) => {
      setState({ isRunning: true, report: null, error: null });
      const message: GcDetectorInputMessage = {
        type: "DETECT",
        payload: { samples, params },
      };
      getWorker().postMessage(message);
    },
    [getWorker],
  );

  return { detect, state };
}
