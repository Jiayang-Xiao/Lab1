import { CircleShape } from './CircleShape';
import { EllipseShape } from './EllipseShape';
import { GroupShape } from './GroupShape';
import { LineShape } from './LineShape';
import { RectShape } from './RectShape';
import { Shape } from './Shape';
import { TextShape } from './TextShape';

export class ShapeFactory {
  // Phase 1's single shape-name dispatch site; later replace this fixed table with registration.
  private readonly types = new Map<string, new (id: string) => Shape>([
    ['rect', RectShape], ['circle', CircleShape], ['ellipse', EllipseShape],
    ['line', LineShape], ['text', TextShape], ['g', GroupShape],
  ]);
  empty(type: string, id: string): Shape {
    const constructor = this.types.get(type);
    if (!constructor) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    return new constructor(id);
  }
  create(type: string, id: string, args: readonly string[]): Shape {
    const shape = this.empty(type, id);
    shape.configure(args);
    return shape;
  }
}
