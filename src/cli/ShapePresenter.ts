import { Canvas } from '../domain/Canvas';
import { Shape } from '../domain/Shape';

export class ShapePresenter {
  tree(document: Canvas, id?: string): readonly string[] {
    const lines: string[] = [];
    const root = id === undefined ? undefined : document.find(id);
    lines.push(root ? this.line(root) : `svg (${document.width}x${document.height})`);
    this.children(root?.children ?? document.children, '', lines);
    return lines;
  }
  show(shape: Shape): readonly string[] {
    const lines = [`${shape.label}  parent=${shape.parent?.label ?? 'svg'}`];
    const attributes = shape.attributes().filter(([name]) => name !== 'id');
    if (attributes.length) lines.push(`  ${attributes.map(([k, v]) => `${k}=${v}`).join(' ')}`);
    if (shape.textContent !== undefined) lines.push(`  text=${JSON.stringify(shape.textContent)}`);
    return lines;
  }
  private line(shape: Shape): string {
    const summary = [shape.geometrySummary(), shape.paintSummary()].filter(Boolean).join(' ');
    return `${shape.label}${summary ? `  ${summary}` : ''}`;
  }
  private children(shapes: readonly Shape[], prefix: string, lines: string[]): void {
    shapes.forEach((shape, index) => {
      const last = index === shapes.length - 1;
      lines.push(`${prefix}${last ? '└── ' : '├── '}${this.line(shape)}`);
      this.children(shape.children, `${prefix}${last ? '    ' : '│   '}`, lines);
    });
  }
}
