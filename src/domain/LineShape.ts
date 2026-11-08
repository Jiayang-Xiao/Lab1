import { Geometry } from './Geometry';
import { Shape } from './Shape';

export class LineShape extends Shape {
  constructor(id: string) { super(id, new Geometry(['x1', 'x2'], ['y1', 'y2'])); }
  get tag(): string { return 'line'; }
  protected override get parameterNames(): readonly string[] { return ['x1', 'y1', 'x2', 'y2']; }
  protected override get optionalPaint(): string { return 'stroke'; }
  protected copyOwn(): LineShape { return new LineShape(this.id); }
  override geometrySummary(): string {
    return `(${this.geometry.get('x1')},${this.geometry.get('y1')}) -> (${this.geometry.get('x2')},${this.geometry.get('y2')})`;
  }
}
