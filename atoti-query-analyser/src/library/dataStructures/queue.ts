export class Queue<T> {
  constructor(private headStack: Array<T> = [], private tailStack: Array<T> = []) {
  }

  _relocate(): void {
    const tmp = this.headStack;
    this.headStack = this.tailStack;
    this.tailStack = tmp;

    this.headStack.reverse();
  }

  get length(): number {
    return this.headStack.length + this.tailStack.length;
  }

  empty(): boolean {
    return this.length === 0;
  }

  push(value: T): void {
    this.tailStack.push(value);
  }

  pop(): T | undefined {
    if (this.length === 0) {
      return undefined;
    }

    if (this.headStack.length === 0) {
      this._relocate();
    }
    return this.headStack.pop();
  }
}