src/library/graphProcessors/filterAndInverse.ts
===
This module contains the function `filterAndInverse()`, which, given a graph and a set of selected vertices, builds a
filtered graph (containing only selected vertices) and its transposed copy. The function adds virtual
vertices `virtualSource` and `virtualTarget` to both graphs.