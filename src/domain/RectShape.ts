import { Geometry } from './Geometry';
import { Shape } from './Shape';

export class RectShape extends Shape {
  constructor(id: string) { super(id, new Geometry(['x'], ['y'], ['width', 'height'])); }
  get tag(): string { return 'rect'; }
  protected copyOwn(): RectShape { return new RectShape(this.id); }
  override geometrySummary(): string {
    return `x=${this.geometry.get('x')} y=${this.geometry.get('y')} w=${this.geometry.get('width')} h=${this.geometry.get('height')}`;
  }
  override positionSummary(): string { return `(${this.geometry.get('x')},${this.geometry.get('y')})`; }
}
