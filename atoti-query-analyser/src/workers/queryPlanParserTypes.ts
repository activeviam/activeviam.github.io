import { ServerInput } from "../library/inputProcessors/server";

// Messages from Main Thread to Worker
export type WorkerInputMessage =
  | {
      type: "PARSE_JSON";
      payload: { rawInput: string; labelHint?: string };
    }
  | {
      type: "PARSE_V1";
      payload: { rawInput: string; labelHint?: string };
    }
  | {
      type: "FETCH_AND_PARSE";
      payload: ServerInput;
    };

// Progress phases
export type ProgressPhase = "parsing" | "converting" | "saving";

// Messages from Worker to Main Thread
export type WorkerOutputMessage =
  | {
      type: "PROGRESS";
      payload: { phase: ProgressPhase; message: string; progress?: number };
    }
  | {
      type: "SUCCESS";
      payload: { entryId: number; rawJson: unknown };
    }
  | {
      type: "ERROR";
      payload: { message: string; phase: string };
    }
  | {
      type: "WARNING";
      payload: { message: string };
    };

// State for the React hook
export interface WorkerState {
  isProcessing: boolean;
  phase: ProgressPhase | null;
  message: string;
  progress?: number;
  warnings: string[];
}
