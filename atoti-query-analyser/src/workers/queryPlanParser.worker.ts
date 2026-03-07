import { parseMultiV1, convertToV2 } from "../library/inputProcessors/v1tov2";
import { queryServer, ServerInput } from "../library/inputProcessors/server";
import {
  saveRecentQueryPlan,
  extractLabel,
} from "../library/storage/recentQueryPlans";
import type {
  WorkerInputMessage,
  WorkerOutputMessage,
} from "./queryPlanParserTypes";

function postProgress(
  phase: WorkerOutputMessage extends { type: "PROGRESS"; payload: infer P }
    ? P["phase"]
    : never,
  message: string,
  progress?: number,
) {
  const msg: WorkerOutputMessage = {
    type: "PROGRESS",
    payload: { phase, message, progress },
  };
  self.postMessage(msg);
}

function postWarning(message: string) {
  const msg: WorkerOutputMessage = { type: "WARNING", payload: { message } };
  self.postMessage(msg);
}

function postSuccess(entryId: number, rawJson: unknown) {
  const msg: WorkerOutputMessage = {
    type: "SUCCESS",
    payload: { entryId, rawJson },
  };
  self.postMessage(msg);
}

function postError(message: string, phase: string) {
  const msg: WorkerOutputMessage = {
    type: "ERROR",
    payload: { message, phase },
  };
  self.postMessage(msg);
}

async function handleParseJson(rawInput: string, labelHint?: string) {
  postProgress("parsing", "Parsing JSON...");

  let rawJson: unknown;
  try {
    const parsedJson = JSON.parse(rawInput);
    rawJson = Object.hasOwn(parsedJson, "data") ? parsedJson.data : parsedJson;
  } catch (err) {
    throw new Error(
      `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  postProgress("saving", "Saving to history...");
  const label = labelHint || extractLabel(rawJson);
  const entryId = await saveRecentQueryPlan(label, rawJson);

  postSuccess(entryId, rawJson);
}

async function handleParseV1(rawInput: string, labelHint?: string) {
  postProgress("parsing", "Parsing V1 logs...", 0);

  const v1Collection = await parseMultiV1(
    rawInput,
    (currentLine, lineCount) => {
      const progress = Math.round((currentLine / lineCount) * 100);
      postProgress(
        "parsing",
        `Processed ${currentLine} lines out of ${lineCount}`,
        progress,
      );
    },
  );

  postProgress("converting", "Converting to V2 format...");
  const rawJson: unknown[] = [];
  for (const v1 of v1Collection) {
    const { errors, result } = convertToV2(v1);
    rawJson.push(result);
    for (const error of errors) {
      postWarning(error.message);
    }
  }

  postProgress("saving", "Saving to history...");
  const label = labelHint || extractLabel(rawJson);
  const entryId = await saveRecentQueryPlan(label, rawJson);

  postSuccess(entryId, rawJson);
}

async function handleFetchAndParse(serverInput: ServerInput) {
  postProgress("parsing", "Fetching from server...");

  const rawJson = await queryServer(serverInput);

  postProgress("saving", "Saving to history...");
  const label = extractLabel(rawJson);
  const entryId = await saveRecentQueryPlan(label, rawJson);

  postSuccess(entryId, rawJson);
}

self.onmessage = async (event: MessageEvent<WorkerInputMessage>) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case "PARSE_JSON":
        await handleParseJson(payload.rawInput, payload.labelHint);
        break;
      case "PARSE_V1":
        await handleParseV1(payload.rawInput, payload.labelHint);
        break;
      case "FETCH_AND_PARSE":
        await handleFetchAndParse(payload);
        break;
      default:
        postError(
          `Unknown message type: ${(event.data as { type: string }).type}`,
          "init",
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    postError(message, type.toLowerCase().replace("_", " "));
  }
};
