import { requireNonNull } from "../utilities/util";

export class Dictionary<T> extends Map<T, number> {
  index(key: T): number {
    if (!this.has(key)) {
      this.set(key, this.size);
    }

    return requireNonNull(this.get(key));
  }

}