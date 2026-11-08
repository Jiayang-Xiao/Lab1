import { Geometry } from './Geometry';
import { NumericValue } from './NumericValue';
import { Shape } from './Shape';
import { ShapeCollection } from './ShapeCollection';

export class GroupShape extends Shape {
  private readonly content = new ShapeCollection(this);
  constructor(id: string) { super(id, new Geometry([], [])); }
  get tag(): string { return 'g'; }
  get collection(): ShapeCollection { return this.content; }
  override get children(): readonly Shape[] { return this.content.all; }
  protected override get optionalPaint(): undefined { return undefined; }
  override asContainer(): GroupShape { return this; }
  override movementSummary(dx: number, dy: number): string { return `by (${dx},${dy})`; }
  override contains(shape: Shape): boolean { return this === shape || this.children.some(child => child.contains(shape)); }
  override move(dx: number, dy: number): void {
    NumericValue.finite(dx, 'dx');
    NumericValue.finite(dy, 'dy');
    for (const child of this.children) child.move(dx, dy);
  }
  override scale(factor: number): void {
    NumericValue.positive(factor, 'scale factor');
    for (const child of this.children) child.scale(factor);
  }
  protected copyOwn(): GroupShape {
    const copy = new GroupShape(this.id);
    for (const child of this.children) copy.collection.insert(child.clone());
    return copy;
  }
}
