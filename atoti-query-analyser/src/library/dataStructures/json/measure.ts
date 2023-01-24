import { validateString } from "./validatingUtils";

export type Measure = string;

/**
 * Deep validation of JSON parse result, expected to be {@link Measure}.
 */
export const validateMeasure = validateString;
