import {
  optional,
  validateInt,
  validateList,
  validateObject,
} from "./validatingUtils";

export interface TimingInfo {
  startTime?: number[];
  elapsedTime?: number[];
  broadcastingTime?: number[];
  executionTime?: number[];
  processingTime?: number[];
  aggregationProcedureTime?: number[];
}

// Reason: `validate...()` function
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Deep validation of JSON parse result, expected to be {@link TimingInfo}.
 */
export function validateTimingInfo(rawTimingInfo: any): TimingInfo {
  validateObject(rawTimingInfo);
  const validator = (value: any) =>
    optional(value, (lst) => validateList(lst, validateInt));
  return {
    startTime: validator(rawTimingInfo.startTime),
    elapsedTime: validator(rawTimingInfo.elapsedTime),
    broadcastingTime: validator(rawTimingInfo.broadcastingTime),
    executionTime: validator(rawTimingInfo.executionTime),
    processingTime: validator(rawTimingInfo.processingTime),
    aggregationProcedureTime: validator(rawTimingInfo.aggregationProcedureTime),
  };
}
