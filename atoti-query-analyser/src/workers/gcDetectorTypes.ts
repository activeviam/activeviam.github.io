import type {
  GcDetectionParams,
  GcDetectionReport,
  TimingSample,
} from "../library/gcDetection/detectGcPauses";

// Messages from Main Thread to Worker
export type GcDetectorInputMessage = {
  type: "DETECT";
  payload: { samples: TimingSample[]; params?: GcDetectionParams };
};

// Messages from Worker to Main Thread
export type GcDetectorOutputMessage =
  | { type: "SUCCESS"; payload: { report: GcDetectionReport } }
  | { type: "ERROR"; payload: { message: string } };

// State for the React hook
export interface GcDetectorState {
  isRunning: boolean;
  report: GcDetectionReport | null;
  error: string | null;
}
