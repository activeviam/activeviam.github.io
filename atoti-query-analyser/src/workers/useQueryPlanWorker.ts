import { useCallback, useEffect, useRef, useState } from "react";
import { ServerInput } from "../library/inputProcessors/server";
import type {
  WorkerInputMessage,
  WorkerOutputMessage,
  WorkerState,
} from "./queryPlanParserTypes";

export interface WorkerResult {
  entryId: number;
  rawJson: unknown;
}

export interface UseQueryPlanWorkerReturn {
  parseJson: (rawInput: string, labelHint?: string) => void;
  parseV1: (rawInput: string, labelHint?: string) => void;
  fetchAndParse: (serverInput: ServerInput) => void;
  state: WorkerState;
  reset: () => void;
}

const initialState: WorkerState = {
  isProcessing: false,
  phase: null,
  message: "",
  progress: undefined,
  warnings: [],
};

export function useQueryPlanWorker(
  onSuccess: (result: WorkerResult) => void,
  onError: (error: Error) => void,
): UseQueryPlanWorkerReturn {
  const [state, setState] = useState<WorkerState>(initialState);
  const workerRef = useRef<Worker | null>(null);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  // Keep refs in sync with latest callbacks
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  // Create and cleanup worker
  useEffect(() => {
    const worker = new Worker(
      new URL("./queryPlanParser.worker.ts", import.meta.url),
      { type: "module" },
    );

    worker.onmessage = (event: MessageEvent<WorkerOutputMessage>) => {
      const message = event.data;

      switch (message.type) {
        case "PROGRESS":
          setState((prev) => ({
            ...prev,
            phase: message.payload.phase,
            message: message.payload.message,
            progress: message.payload.progress,
          }));
          break;

        case "WARNING":
          setState((prev) => ({
            ...prev,
            warnings: [...prev.warnings, message.payload.message],
          }));
          break;

        case "SUCCESS":
          setState(initialState);
          onSuccessRef.current({
            entryId: message.payload.entryId,
            rawJson: message.payload.rawJson,
          });
          break;

        case "ERROR":
          setState(initialState);
          onErrorRef.current(
            new Error(`${message.payload.phase}: ${message.payload.message}`),
          );
          break;
      }
    };

    worker.onerror = (event) => {
      setState(initialState);
      onErrorRef.current(new Error(event.message || "Worker error"));
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const postMessage = useCallback((message: WorkerInputMessage) => {
    if (!workerRef.current) {
      onErrorRef.current(new Error("Worker not initialized"));
      return;
    }
    setState({
      isProcessing: true,
      phase: null,
      message: "Starting...",
      progress: undefined,
      warnings: [],
    });
    workerRef.current.postMessage(message);
  }, []);

  const parseJson = useCallback(
    (rawInput: string, labelHint?: string) => {
      postMessage({
        type: "PARSE_JSON",
        payload: { rawInput, labelHint },
      });
    },
    [postMessage],
  );

  const parseV1 = useCallback(
    (rawInput: string, labelHint?: string) => {
      postMessage({
        type: "PARSE_V1",
        payload: { rawInput, labelHint },
      });
    },
    [postMessage],
  );

  const fetchAndParse = useCallback(
    (serverInput: ServerInput) => {
      postMessage({
        type: "FETCH_AND_PARSE",
        payload: serverInput,
      });
    },
    [postMessage],
  );

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    parseJson,
    parseV1,
    fetchAndParse,
    state,
    reset,
  };
}
