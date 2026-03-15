import {
  ARetrieval,
  AggregateRetrieval,
  AggregateRetrievalKind,
  ExternalRetrieval,
  ExternalRetrievalKind,
} from "../dataStructures/json/retrieval";
import { CubeLocation } from "../dataStructures/json/cubeLocation";

export type DiffStatus =
  | "same"
  | "left-only"
  | "right-only"
  | "different"
  | "na";

export interface ArrayDiffItem {
  value: string;
  status: "same" | "left-only" | "right-only";
}

export interface LevelDiffItem {
  levelName: string;
  levelIndex: number; // The index of the level in the hierarchy
  leftPath: string | null;
  rightPath: string | null;
  status: "same" | "left-only" | "right-only" | "different";
}

export interface LocationDiffItem {
  key: string; // dimension:hierarchy
  dimension: string;
  hierarchy: string;
  status: "same" | "left-only" | "right-only" | "different";
  levels: LevelDiffItem[];
}

export interface ScalarDiffResult {
  leftValue: string | null;
  rightValue: string | null;
  status: DiffStatus;
}

export interface NodeComparisonResult {
  type: ScalarDiffResult;
  location: LocationDiffItem[];
  measures: ArrayDiffItem[];
  filterId: ScalarDiffResult;
  provider: ScalarDiffResult;
  partitioning: ScalarDiffResult;
}

/**
 * Compute set-based diff for string arrays (e.g., Measures)
 */
export function computeArrayDiff(
  left: string[],
  right: string[],
): ArrayDiffItem[] {
  const leftSet = new Set(left);
  const rightSet = new Set(right);

  const common: ArrayDiffItem[] = [];
  const leftOnly: ArrayDiffItem[] = [];
  const rightOnly: ArrayDiffItem[] = [];

  // Find common and left-only
  for (const item of left) {
    if (rightSet.has(item)) {
      common.push({ value: item, status: "same" });
    } else {
      leftOnly.push({ value: item, status: "left-only" });
    }
  }

  // Find right-only
  for (const item of right) {
    if (!leftSet.has(item)) {
      rightOnly.push({ value: item, status: "right-only" });
    }
  }

  // Sort each group alphabetically
  common.sort((a, b) => a.value.localeCompare(b.value));
  leftOnly.sort((a, b) => a.value.localeCompare(b.value));
  rightOnly.sort((a, b) => a.value.localeCompare(b.value));

  // Return common items first, then unique items
  return [...common, ...leftOnly, ...rightOnly];
}

/**
 * Serialize a path value to a string for display and comparison
 */
function serializePath(pathPart: unknown | unknown[]): string {
  if (Array.isArray(pathPart)) {
    return "[" + pathPart.join(", ") + "]";
  }
  return JSON.stringify(pathPart);
}

/**
 * Compare levels within a single hierarchy, including paths
 * Skips the "ALL" level at index 0 (like the details view)
 */
function compareLevels(
  leftLoc: CubeLocation | undefined,
  rightLoc: CubeLocation | undefined,
): LevelDiffItem[] {
  const leftLevels = leftLoc?.level ?? [];
  const rightLevels = rightLoc?.level ?? [];
  const leftPaths = leftLoc?.path ?? [];
  const rightPaths = rightLoc?.path ?? [];

  // Build maps of level name -> { index, path }
  // Skip "ALL" level at index 0
  const leftLevelMap = new Map<string, { index: number; path: string }>();
  const rightLevelMap = new Map<string, { index: number; path: string }>();

  for (let i = 0; i < leftLevels.length; i++) {
    const levelName = leftLevels[i];
    // Skip ALL level at index 0
    if (i === 0 && levelName === "ALL") continue;
    const pathStr = i < leftPaths.length ? serializePath(leftPaths[i]) : "";
    leftLevelMap.set(levelName, { index: i, path: pathStr });
  }

  for (let i = 0; i < rightLevels.length; i++) {
    const levelName = rightLevels[i];
    // Skip ALL level at index 0
    if (i === 0 && levelName === "ALL") continue;
    const pathStr = i < rightPaths.length ? serializePath(rightPaths[i]) : "";
    rightLevelMap.set(levelName, { index: i, path: pathStr });
  }

  const allLevelNames = new Set([
    ...leftLevelMap.keys(),
    ...rightLevelMap.keys(),
  ]);
  const result: LevelDiffItem[] = [];

  for (const levelName of allLevelNames) {
    const leftEntry = leftLevelMap.get(levelName);
    const rightEntry = rightLevelMap.get(levelName);
    // Use the index from left if available, otherwise right
    const levelIndex = leftEntry?.index ?? rightEntry?.index ?? 0;

    if (leftEntry && rightEntry) {
      // Both have this level - compare paths
      const pathsEqual = leftEntry.path === rightEntry.path;
      result.push({
        levelName,
        levelIndex,
        leftPath: leftEntry.path,
        rightPath: rightEntry.path,
        status: pathsEqual ? "same" : "different",
      });
    } else if (leftEntry) {
      result.push({
        levelName,
        levelIndex,
        leftPath: leftEntry.path,
        rightPath: null,
        status: "left-only",
      });
    } else if (rightEntry) {
      result.push({
        levelName,
        levelIndex,
        leftPath: null,
        rightPath: rightEntry.path,
        status: "right-only",
      });
    }
  }

  // Sort by level index
  result.sort((a, b) => a.levelIndex - b.levelIndex);

  return result;
}

/**
 * Compare locations by dimension:hierarchy key
 */
export function computeLocationDiff(
  left: CubeLocation[],
  right: CubeLocation[],
): LocationDiffItem[] {
  const leftMap = new Map<string, CubeLocation>();
  const rightMap = new Map<string, CubeLocation>();

  for (const loc of left) {
    const key = `${loc.dimension}:${loc.hierarchy}`;
    leftMap.set(key, loc);
  }

  for (const loc of right) {
    const key = `${loc.dimension}:${loc.hierarchy}`;
    rightMap.set(key, loc);
  }

  const allKeys = new Set([...leftMap.keys(), ...rightMap.keys()]);
  const result: LocationDiffItem[] = [];

  for (const key of allKeys) {
    const leftLoc = leftMap.get(key);
    const rightLoc = rightMap.get(key);
    const levels = compareLevels(leftLoc, rightLoc);

    // Determine overall status
    let status: "same" | "left-only" | "right-only" | "different";
    if (leftLoc && rightLoc) {
      const allSame = levels.every((l) => l.status === "same");
      status = allSame ? "same" : "different";
    } else if (leftLoc) {
      status = "left-only";
    } else {
      status = "right-only";
    }

    result.push({
      key,
      dimension: leftLoc?.dimension ?? rightLoc!.dimension,
      hierarchy: leftLoc?.hierarchy ?? rightLoc!.hierarchy,
      status,
      levels,
    });
  }

  // Sort by key
  result.sort((a, b) => a.key.localeCompare(b.key));

  return result;
}

/**
 * Compare scalar values
 */
function compareScalar(
  left: string | number | null | undefined,
  right: string | number | null | undefined,
): ScalarDiffResult {
  const leftStr = left != null ? String(left) : null;
  const rightStr = right != null ? String(right) : null;

  if (leftStr === null && rightStr === null) {
    return { leftValue: null, rightValue: null, status: "na" };
  }
  if (leftStr === null) {
    return { leftValue: null, rightValue: rightStr, status: "right-only" };
  }
  if (rightStr === null) {
    return { leftValue: leftStr, rightValue: null, status: "left-only" };
  }
  if (leftStr === rightStr) {
    return { leftValue: leftStr, rightValue: rightStr, status: "same" };
  }
  return { leftValue: leftStr, rightValue: rightStr, status: "different" };
}

/**
 * Type guard for AggregateRetrieval
 */
function isAggregateRetrieval(r: ARetrieval): r is AggregateRetrieval {
  return r.$kind === AggregateRetrievalKind;
}

/**
 * Type guard for ExternalRetrieval
 */
function isExternalRetrieval(r: ARetrieval): r is ExternalRetrieval {
  return r.$kind === ExternalRetrievalKind;
}

/**
 * Main comparison function
 */
export function compareNodes(
  left: ARetrieval,
  right: ARetrieval,
): NodeComparisonResult {
  // Type
  const type = compareScalar(left.type, right.type);

  // Location (only for AggregateRetrieval)
  const leftLocation = isAggregateRetrieval(left) ? left.location : [];
  const rightLocation = isAggregateRetrieval(right) ? right.location : [];
  const location = computeLocationDiff(leftLocation, rightLocation);

  // Measures (AggregateRetrieval or ExternalRetrieval's joinedMeasure)
  // Note: Measure type is just string, not an object
  const leftMeasures = isAggregateRetrieval(left)
    ? left.measures
    : isExternalRetrieval(left)
      ? left.joinedMeasure
      : [];
  const rightMeasures = isAggregateRetrieval(right)
    ? right.measures
    : isExternalRetrieval(right)
      ? right.joinedMeasure
      : [];
  const measures = computeArrayDiff(leftMeasures, rightMeasures);

  // Filter ID (only for AggregateRetrieval)
  const leftFilterId = isAggregateRetrieval(left) ? left.filterId : null;
  const rightFilterId = isAggregateRetrieval(right) ? right.filterId : null;
  const filterId = compareScalar(leftFilterId, rightFilterId);

  // Provider (measureProvider for AggregateRetrieval, store for ExternalRetrieval)
  const leftProvider = isAggregateRetrieval(left)
    ? left.measureProvider
    : isExternalRetrieval(left)
      ? left.store
      : null;
  const rightProvider = isAggregateRetrieval(right)
    ? right.measureProvider
    : isExternalRetrieval(right)
      ? right.store
      : null;
  const provider = compareScalar(leftProvider, rightProvider);

  // Partitioning (only for AggregateRetrieval)
  const leftPartitioning = isAggregateRetrieval(left)
    ? left.partitioning
    : null;
  const rightPartitioning = isAggregateRetrieval(right)
    ? right.partitioning
    : null;
  const partitioning = compareScalar(leftPartitioning, rightPartitioning);

  return {
    type,
    location,
    measures,
    filterId,
    provider,
    partitioning,
  };
}
