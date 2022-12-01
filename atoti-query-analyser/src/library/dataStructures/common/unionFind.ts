export class UnionFind<T> {
  constructor(private readonly parentMap: Map<T, T> = new Map(), private readonly treeDepth: Map<T, number> = new Map()) {
  }

  find(key: T): T {
    if (!this.parentMap.has(key)) {
      return key;
    }

    const parent = this.parentMap.get(key) as T;
    if (!this.parentMap.has(parent)) {
      return parent;
    }

    const root = this.find(parent);
    this.parentMap.set(key, root);
    return root;
  }

  union(left: T, right: T): void {
    left = this.find(left);
    right = this.find(right);

    if (left === right) {
      return;
    }

    const leftDepth = this.treeDepth.get(left) || 1;
    const rightDepth = this.treeDepth.get(right) || 1;
    if (leftDepth < rightDepth) {
      this.parentMap.set(left, right);
      this.treeDepth.set(left, Math.max(leftDepth, rightDepth + 1));
    } else {
      this.parentMap.set(right, left);
      this.treeDepth.set(right, Math.max(rightDepth, leftDepth + 1));
    }
  }
}