import { NumericValue } from '../domain/NumericValue';
import { Token } from './Token';

export class ArgumentList {
  constructor(private readonly tokens: readonly Token[]) {}
  get length(): number { return this.tokens.length; }
  at(index: number): string {
    const token = this.tokens[index];
    if (!token) throw new Error('missing argument');
    return token.value;
  }
  values(start = 0, end = this.length): readonly string[] { return this.tokens.slice(start, end).map(t => t.value); }
  isKeyword(index: number, keyword: string): boolean {
    const token = this.tokens[index];
    return token?.value === keyword && !token.quoted;
  }
  number(index: number, label: string): number { return NumericValue.parse(this.at(index), label); }
  require(min: number, max: number, usage: string): void {
    if (this.length < min || this.length > max) throw new Error(`usage: ${usage}`);
  }
}
