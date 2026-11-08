import { Geometry } from './Geometry';
import { Shape } from './Shape';

export class EllipseShape extends Shape {
  constructor(id: string) { super(id, new Geometry(['cx'], ['cy'], ['rx', 'ry'])); }
  get tag(): string { return 'ellipse'; }
  protected copyOwn(): EllipseShape { return new EllipseShape(this.id); }
  override positionSummary(): string { return `(${this.geometry.get('cx')},${this.geometry.get('cy')})`; }
}
