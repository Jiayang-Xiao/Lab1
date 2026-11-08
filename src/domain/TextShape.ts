import { Geometry } from './Geometry';
import { Shape } from './Shape';

export class TextShape extends Shape {
  private content = '';
  constructor(id: string) { super(id, new Geometry(['x'], ['y'])); }
  get tag(): string { return 'text'; }
  override get textContent(): string { return this.content; }
  protected override get optionalPaint(): undefined { return undefined; }
  override configure(args: readonly string[]): void {
    if (args.length !== 3) throw new Error('invalid parameters for text: expected x y "content"');
    super.configure(args.slice(0, 2));
    this.setAttribute('text', args[2]!);
  }
  override setAttribute(name: string, value: string): void {
    if (name === 'text') { Shape.validateText(value); this.content = value; }
    else super.setAttribute(name, value);
  }
  protected copyOwn(): TextShape {
    const copy = new TextShape(this.id);
    copy.content = this.content;
    return copy;
  }
  override geometrySummary(): string {
    return `(${this.geometry.get('x')},${this.geometry.get('y')}) ${JSON.stringify(this.content)}`;
  }
  override positionSummary(): string { return `(${this.geometry.get('x')},${this.geometry.get('y')})`; }
}
