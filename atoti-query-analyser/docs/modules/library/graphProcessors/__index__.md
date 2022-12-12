# /modules/library/graphProcessors 

[Parent directory](../__index__.md)


## Table of contents 
* [buildGraph.md](#__autogen_61__)
* [cluster.md](#__autogen_62__)
* [criticalPath.md](#__autogen_63__)
* [extractMetadata.md](#__autogen_64__)
* [fillTimingInfo.md](#__autogen_65__)
* [filterAndInverse.md](#__autogen_66__)
* [selection.md](#__autogen_67__)


## src/library/graphProcessors/buildGraph.ts <a id="__autogen_61__"></a>

This module contains the `buildGraph()` function, which builds the retrievals graph based on the data
from `JsonQueryPlan`.

## src/library/graphProcessors/cluster.ts <a id="__autogen_62__"></a>

This module contains the `addClustersToNodes()` function, which receives a graph as input, selects connectivity
components in it, and marks the vertices with component numbers.

## src/library/graphProcessors/criticalPath.ts <a id="__autogen_63__"></a>

This module contains a `criticalPath()` function that searches the graph for "critical path". The critical path
includes those retrievals that are executed strictly sequentially, and at the same time, each next retrieval from the
chain can be launched immediately after the completion of the previous one, since the rest of the dependencies were
calculated earlier. Thus, the critical path shows which retrievals affect performance the most.

## src/library/graphView/extractMetadata.ts <a id="__autogen_64__"></a>

This module contains the `extractMetadata()` function, which extracts data about passes and query trees from
the `QueryPlan[]` array.

## src/library/graphProcessors/fillTimingInfo.ts <a id="__autogen_65__"></a>

This module contains the `setSimulatedTimingInfo()` function. If there is no execution time in the request data, this
function simulates the execution of the retrievals graph and sets the time according to the simulation.

## src/library/graphProcessors/filterAndInverse.ts <a id="__autogen_66__"></a>

This module contains the function `filterAndInverse()`, which, given a graph and a set of selected vertices, builds a
filtered graph (containing only selected vertices) and its transposed copy. The function adds virtual
vertices `virtualSource` and `virtualTarget` to both graphs.

## src/library/graphProcessors/selection.ts <a id="__autogen_67__"></a>

This module contains functions for constructing vertex selections.