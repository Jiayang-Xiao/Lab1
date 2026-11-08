import { Geometry } from './Geometry';
import { Shape } from './Shape';

export class CircleShape extends Shape {
  constructor(id: string) { super(id, new Geometry(['cx'], ['cy'], ['r'])); }
  get tag(): string { return 'circle'; }
  protected copyOwn(): CircleShape { return new CircleShape(this.id); }
  override positionSummary(): string { return `(${this.geometry.get('cx')},${this.geometry.get('cy')})`; }
}
