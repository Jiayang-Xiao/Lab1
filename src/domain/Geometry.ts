import { NumericValue } from './NumericValue';

export class Geometry {
  private readonly values = new Map<string, number>();
  constructor(
    private readonly horizontal: readonly string[],
    private readonly vertical: readonly string[],
    private readonly dimensions: readonly string[] = [],
  ) {
    for (const key of [...horizontal, ...vertical, ...dimensions]) this.values.set(key, 0);
  }

  get keys(): readonly string[] { return [...this.values.keys()]; }
  has(key: string): boolean { return this.values.has(key); }
  get(key: string): number {
    const value = this.values.get(key);
    if (value === undefined) throw new Error(`unknown attribute: ${key}`);
    return value;
  }
  set(key: string, value: number): void {
    if (!this.has(key)) throw new Error(`unknown attribute: ${key}`);
    NumericValue.finite(value, key);
    if (this.dimensions.includes(key) && value < 0) throw new Error(`${key} must be non-negative`);
    this.values.set(key, Object.is(value, -0) ? 0 : value);
  }
  move(dx: number, dy: number): void {
    NumericValue.finite(dx, 'dx');
    NumericValue.finite(dy, 'dy');
    for (const key of this.horizontal) this.set(key, this.get(key) + dx);
    for (const key of this.vertical) this.set(key, this.get(key) + dy);
  }
  scale(factor: number): void {
    NumericValue.positive(factor, 'scale factor');
    for (const key of this.keys) this.set(key, this.get(key) * factor);
  }
  entries(): [string, string][] { return [...this.values].map(([k, v]) => [k, String(v)]); }
  copyTo(other: Geometry): void { for (const [key, value] of this.values) other.set(key, value); }
}
