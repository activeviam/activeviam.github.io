src/library/graphProcessors/criticalPath.ts
===
This module contains a `criticalPath()` function that searches the graph for "critical path". The critical path
includes those retrievals that are executed strictly sequentially, and at the same time, each next retrieval from the
chain can be launched immediately after the completion of the previous one, since the rest of the dependencies were
calculated earlier. Thus, the critical path shows which retrievals affect performance the most.