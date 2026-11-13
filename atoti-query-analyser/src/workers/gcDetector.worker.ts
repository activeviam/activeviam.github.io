import { detectGcPauses } from "../library/gcDetection/detectGcPauses";
import type { GcDetectorInputMessage, GcDetectorOutputMessage } from "./gcDetectorTypes";

self.onmessage = (event: MessageEvent<GcDetectorInputMessage>) => {
  let message: GcDetectorOutputMessage;
  try {
    if (event.data.type !== "DETECT") {
      throw new Error(`Unknown message type: ${event.data.type}`);
    }
    const { samples, params } = event.data.payload;
    message = {
      type: "SUCCESS",
      payload: { report: detectGcPauses(samples, params) },
    };
  } catch (err) {
    message = {
      type: "ERROR",
      payload: { message: err instanceof Error ? err.message : String(err) },
    };
  }
  self.postMessage(message);
};
