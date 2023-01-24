import { requireNonNull } from "../../utilities/util";

/**
 * This class is an extension of the <code>Map</code> class. This class is
 * designed to assign unique ordinal numbers to possibly repeating elements from
 * some sequence. <code>Dictionary</code> values are integers.
 * @typeParam T - key type
 * */
export class Dictionary<T> extends Map<T, number> {
  index(key: T): number {
    if (!this.has(key)) {
      this.set(key, this.size);
    }

    return requireNonNull(this.get(key));
  }
}
