import { Token } from './Token';

export class Tokenizer {
  tokenize(line: string): readonly Token[] {
    if (line.trimStart().startsWith('#')) return [];
    const tokens: Token[] = [];
    let value = '';
    let active = false;
    let quoted = false;
    let inside = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i]!;
      if (char === '"') { inside = !inside; active = true; quoted = true; }
      else if (inside && char === '\\' && (line[i + 1] === '"' || line[i + 1] === '\\')) {
        value += line[++i]!;
      } else if (!inside && /\s/.test(char)) {
        if (active) { tokens.push({ value, quoted }); value = ''; active = false; quoted = false; }
      } else { value += char; active = true; }
    }
    if (inside) throw new Error('unterminated double quote');
    if (active) tokens.push({ value, quoted });
    return tokens;
  }
}
