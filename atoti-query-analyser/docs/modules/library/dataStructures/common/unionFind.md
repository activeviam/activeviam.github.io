src/library/dataStructures/common/unionFind.ts
===
This module contains the `UnionFind<T>` class.

The UnionFind data structure is a system of disjoint sets. At the initial moment of time, each possible value of
type `T` forms its own one-element set.

UnionFind supports two types of operations:

* `union(x, y)` merges sets containing `x` and `y`;
* `find(x)` finds a _representative_ of the set containing `x`.

The following invariant holds for the `find` operation. Let `x` and `y` lie in the same set `S`. If between the
queries `find(x)` and `find(y)` the set `S` has not been merged with any other set, then `find(x) === find(y)`. In
particular, if all `union` operations precede all `find` operations, then for any `x` and `y` the
condition `find(x) === find(y)` is equivalent to `x` and `y` are in the same set.