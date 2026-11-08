import { NumericValue } from '../domain/NumericValue';
import { Shape } from '../domain/Shape';

export class SvgTransform {
  private static readonly number = '[+-]?(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][+-]?\\d+)?';
  private static readonly syntax = new RegExp(`^\\s*(?:translate\\(\\s*(${this.number})(?:[\\s,]+(${this.number}))?\\s*\\)\\s*)?(?:scale\\(\\s*(${this.number})(?:[\\s,]+(${this.number}))?\\s*\\)\\s*)?$`);
  private constructor(private readonly factor = 1, private readonly dx = 0, private readonly dy = 0) {
    NumericValue.positive(factor, 'SVG transform scale');
    NumericValue.finite(dx, 'SVG transform dx');
    NumericValue.finite(dy, 'SVG transform dy');
  }
  static parse(value = ''): SvgTransform {
    const parts = this.syntax.exec(value);
    if (!parts) throw new Error(`unsupported SVG transform: ${value} (expected translate(dx,dy) scale(s))`);
    const scale = parts[3] === undefined ? 1 : NumericValue.parse(parts[3], 'SVG transform scale');
    if (parts[4] !== undefined && NumericValue.parse(parts[4], 'SVG transform scale') !== scale) {
      throw new Error('unsupported SVG transform: non-uniform scale');
    }
    return new SvgTransform(scale, parts[1] === undefined ? 0 : NumericValue.parse(parts[1], 'SVG transform dx'),
      parts[2] === undefined ? 0 : NumericValue.parse(parts[2], 'SVG transform dy'));
  }
  compose(local: SvgTransform): SvgTransform {
    return new SvgTransform(this.factor * local.factor, this.dx + this.factor * local.dx, this.dy + this.factor * local.dy);
  }
  apply(shape: Shape, strokeWidth: string, fontSize: string): void {
    shape.transformOwnGeometry(this.factor, this.dx, this.dy);
    if (this.factor !== 1 && shape.hasGeometry) {
      shape.importAttribute('stroke-width', String(this.length(strokeWidth, 'stroke-width') * this.factor));
      if (shape.textContent !== undefined) shape.importAttribute('font-size', String(this.length(fontSize, 'font-size') * this.factor));
    }
  }
  private length(value: string, name: string): number { return NumericValue.parse(value.trim().replace(/px$/, ''), name); }
}
