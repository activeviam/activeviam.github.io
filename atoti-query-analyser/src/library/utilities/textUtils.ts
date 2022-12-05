/**
 * This function tries to parse camelCase, PascalCase and snake_case identifiers.
 *
 * Examples:
 * ```
 * extractWords('fooBarHTML') => [ 'foo', 'Bar', 'HTML' ]
 *
 * extractWords('fooBarHTMLEntity01AB23') =>
 * [ 'foo', 'Bar', 'HTML', 'Entity', '01', 'AB', '23' ]
 *
 * extractWords('___Foo_bar_HTMLEntity   QwertyUiop foo_bar_quux') =>
 * [ 'Foo', 'bar', 'HTML', 'Entity', 'Qwerty', 'Uiop', 'foo', 'bar', 'quux' ]
 * ```
 * */
export function extractWords(text: string): Array<string> {
  const re =
    /(\d+)|([A-Z]+(?=([A-Z][a-z]+)|$|[^a-zA-Z]))|((?<=[^a-zA-Z]|^)[a-z]+)|([A-Z][a-z]+)/gm;
  const words = [];

  let match;
  while ((match = re.exec(text)) !== null) {
    words.push(match[0]);
  }

  return words;
}

export function abbreviation(text: string): string {
  const words = extractWords(text);
  return words.map((word) => word[0].toUpperCase()).join("");
}

export function humanisticStringComparator(lhs: string, rhs: string) {
  const leftWords = extractWords(lhs);
  const rightWords = extractWords(rhs);

  const leftToken = leftWords.map((word) => word.toUpperCase()).join();
  const rightToken = rightWords.map((word) => word.toUpperCase()).join();
  return leftToken.localeCompare(rightToken);
}
