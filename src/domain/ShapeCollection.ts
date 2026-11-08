import { Shape } from './Shape';
import type { GroupShape } from './GroupShape';

export class ShapeCollection {
  private readonly items: Shape[] = [];
  constructor(private readonly owner?: GroupShape) {}
  get all(): readonly Shape[] { return [...this.items]; }
  indexOf(shape: Shape): number { return this.items.indexOf(shape); }
  insert(shape: Shape, index = this.items.length): void {
    if (this.items.includes(shape)) throw new Error(`shape already attached: ${shape.id}`);
    this.items.splice(index, 0, shape);
    shape.attachTo(this.owner);
  }
  remove(shape: Shape): void {
    const index = this.indexOf(shape);
    if (index < 0) throw new Error(`shape not attached: ${shape.id}`);
    this.items.splice(index, 1);
    shape.attachTo(undefined);
  }
}
