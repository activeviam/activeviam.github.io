import { QueryPlan } from "../../library/dataStructures/processing/queryPlan";
import { RetrievalGraph } from "../../library/dataStructures/json/retrieval";
import { UUID } from "../../library/utilities/uuid";
import "./Timeline.css";

/**
 * A (retrievalID, partitionID) pair.
 * */
export interface RetrievalCursor {
  id: UUID;
  partition: number;
}

/**
 * Information about execution time of a retrieval on a partition.
 * */
export interface TimeRange {
  retrieval: RetrievalCursor;
  start: number;
  end: number;
}

export type FocusControl = {
  item: RetrievalCursor | null;
  showParents: boolean;
  showChildren: boolean;
};

export const areEqualCursors = (
  focused: RetrievalCursor | null,
  item: RetrievalCursor
) => focused?.id === item.id && focused?.partition === item.partition;

/// Focus management

export type FocusState = {
  focused: RetrievalCursor | null;
  siblings: RetrievalCursor[];
  parents: RetrievalCursor[];
  children: RetrievalCursor[];
};

export type RelativeStateConfig = {
  classes: readonly string[];
  match: (
    selection: readonly RetrievalCursor[],
    focus: Readonly<FocusState>
  ) => readonly RetrievalCursor[];
};

export const relativeStates: readonly RelativeStateConfig[] = [
  {
    classes: ["focused"],
    match: (_, focus) => (focus.focused ? [focus.focused] : []),
  },
  {
    classes: ["sibling"],
    match: (_, focus) => focus.siblings,
  },
  {
    classes: ["parent"],
    match: (_, focus) => focus.parents,
  },
  {
    classes: ["child"],
    match: (_, focus) => focus.children,
  },
  // Place selected at the end, to focus on the timeline first
  {
    classes: ["selected"],
    match: (selection) => selection,
  },
];

export const computeRetrievalClasses = (
  retrieval: Readonly<RetrievalCursor>,
  selection: readonly RetrievalCursor[],
  focus: Readonly<FocusState>
): readonly string[] => {
  for (const state of relativeStates) {
    const refs = state.match(selection, focus);
    const isIncluded = refs.some((entry) => areEqualCursors(retrieval, entry));
    if (isIncluded) {
      return state.classes;
    }
  }
  return [];
};

export const focusOnItem = (
  state: FocusControl,
  entry: RetrievalCursor
): FocusControl => ({
  item: entry,
  showChildren: false,
  showParents: false,
});

export const unfocusOnItem = (
  state: FocusControl,
  entry: RetrievalCursor
): FocusControl =>
  areEqualCursors(state.item, entry)
    ? { item: null, showParents: false, showChildren: false }
    : state;

export const computeChildRetrievals = (
  graph: RetrievalGraph,
  { id }: RetrievalCursor
): RetrievalCursor[] => {
  const childVertices = Array.from(
    graph.getOutgoingEdges(graph.getVertexByUUID(id))
  ).map((edge) => edge.getEnd());
  const uniqueVertices = new Set(childVertices);
  return Array.from(uniqueVertices).flatMap(
    (node) =>
      node.getMetadata().timingInfo.elapsedTime?.map((_, i) => ({
        id: node.getUUID(),
        partition: i,
      })) ?? []
  );
};

export const computeFocusState = (
  plan: QueryPlan,
  focusedItem: RetrievalCursor | null
): FocusState => {
  if (focusedItem === null) {
    return {
      focused: focusedItem,
      siblings: [],
      parents: [],
      children: [],
    };
  } else {
    const siblings =
      plan.graph
        .getVertexByUUID(focusedItem.id)
        .getMetadata()
        .timingInfo.elapsedTime?.filter((_, i) => i !== focusedItem.partition)
        .map((_, i) => ({
          id: focusedItem.id,
          partition: i,
        })) ?? [];
    const parents = computeChildRetrievals(plan.graph, focusedItem);
    const children = computeChildRetrievals(plan.graph.inverse(), focusedItem);

    const result = {
      focused: focusedItem,
      siblings,
      parents,
      children,
    };
    return result;
  }
};
