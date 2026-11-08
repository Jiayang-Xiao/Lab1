import { Geometry } from './Geometry';
import { NumericValue } from './NumericValue';
import type { GroupShape } from './GroupShape';

export abstract class Shape {
  private owner: GroupShape | undefined;
  private readonly presentation = new Map<string, string>();
  private readonly imported = new Map<string, string>();
  private static readonly paint = new Set(['fill', 'stroke', 'stroke-width']);
  private static readonly importable = new Set([
    'font-size', 'font-family', 'font-weight', 'text-anchor', 'dominant-baseline',
    'opacity', 'fill-opacity', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin',
    'stroke-dasharray', 'stroke-dashoffset', 'visibility', 'display', 'data-kind',
  ]);

  protected constructor(private readonly identifier: string, protected readonly geometry: Geometry) {
    Shape.validateText(identifier);
    if (!identifier || /\s/.test(identifier)) throw new Error('id must be non-empty and contain no whitespace');
  }
  abstract get tag(): string;
  protected abstract copyOwn(): Shape;
  get id(): string { return this.identifier; }
  get label(): string { return `${this.tag}#${this.id}`; }
  get parent(): GroupShape | undefined { return this.owner; }
  get children(): readonly Shape[] { return []; }
  get textContent(): string | undefined { return undefined; }
  protected get parameterNames(): readonly string[] { return this.geometry.keys; }
  protected get optionalPaint(): string | undefined { return 'fill'; }

  attachTo(parent: GroupShape | undefined): void { this.owner = parent; }
  asContainer(): GroupShape { throw new Error(`not a container: ${this.id}`); }
  contains(shape: Shape): boolean { return this === shape; }
  configure(args: readonly string[]): void {
    const count = this.parameterNames.length;
    if (args.length < count || args.length > count + (this.optionalPaint ? 1 : 0)) {
      throw new Error(`invalid parameters for ${this.tag}: expected ${this.parameterNames.join(' ')}${this.optionalPaint ? ` [${this.optionalPaint}]` : ''}`);
    }
    this.parameterNames.forEach((key, index) => this.setAttribute(key, args[index]!));
    if (this.optionalPaint && args[count] !== undefined) this.setAttribute(this.optionalPaint, args[count]!);
  }
  move(dx: number, dy: number): void { this.geometry.move(dx, dy); }
  scale(factor: number): void { this.geometry.scale(factor); }
  setAttribute(name: string, value: string): void {
    if (Shape.paint.has(name)) {
      Shape.validateText(value);
      if (!value.trim()) throw new Error(`${name} must not be empty`);
      if (name === 'stroke-width') {
        const width = NumericValue.parse(value, name);
        if (width < 0) throw new Error('stroke-width must be non-negative');
        value = String(width);
      }
      this.presentation.set(name, value);
    } else if (this.geometry.has(name)) {
      this.geometry.set(name, NumericValue.parse(value, name));
    } else throw new Error(`unknown attribute: ${name}`);
  }
  importAttribute(name: string, value: string): void {
    if (Shape.importable.has(name)) {
      Shape.validateText(value);
      this.imported.set(name, value);
    } else this.setAttribute(name, value);
  }
  attributes(): readonly [string, string][] {
    return [['id', this.id], ...this.geometry.entries(), ...this.presentation, ...this.imported];
  }
  geometrySummary(): string { return this.geometry.entries().map(([k, v]) => `${k}=${v}`).join(' '); }
  paintSummary(): string { return [...this.presentation, ...this.imported].map(([k, v]) => `${k}=${v}`).join(' '); }
  positionSummary(): string { return this.geometrySummary(); }
  movementSummary(_dx: number, _dy: number): string { return `to ${this.positionSummary()}`; }
  clone(): Shape {
    const copy = this.copyOwn();
    this.geometry.copyTo(copy.geometry);
    for (const [key, value] of this.presentation) copy.presentation.set(key, value);
    for (const [key, value] of this.imported) copy.imported.set(key, value);
    return copy;
  }
  static validateText(value: string): void {
    // XML 1.0 excludes controls and unpaired surrogates, even inside text nodes.
    for (const char of value) {
      const code = char.codePointAt(0)!;
      if (!(code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 0xd7ff)
        || (code >= 0xe000 && code <= 0xfffd) || (code >= 0x10000 && code <= 0x10ffff))) {
        throw new Error('invalid XML character');
      }
    }
  }
}
