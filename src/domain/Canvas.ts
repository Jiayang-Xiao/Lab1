import { GroupShape } from './GroupShape';
import { NumericValue } from './NumericValue';
import { Shape } from './Shape';
import { ShapeCollection } from './ShapeCollection';

export class Canvas {
  private canvasWidth: number;
  private canvasHeight: number;
  private readonly content = new ShapeCollection();
  private coordinateBox: readonly number[];
  private readonly appearance = new GroupShape('__canvas_attributes__');
  private rootId: string | undefined;
  constructor(width = 800, height = 600) {
    this.canvasWidth = NumericValue.positive(width, 'canvas width');
    this.canvasHeight = NumericValue.positive(height, 'canvas height');
    this.coordinateBox = [0, 0, width, height];
  }
  get width(): number { return this.canvasWidth; }
  get height(): number { return this.canvasHeight; }
  get children(): readonly Shape[] { return this.content.all; }
  get viewBox(): string { return this.coordinateBox.join(' '); }
  setViewBox(x: number, y: number, width: number, height: number): void {
    NumericValue.finite(x, 'viewBox x');
    NumericValue.finite(y, 'viewBox y');
    NumericValue.positive(width, 'viewBox width');
    NumericValue.positive(height, 'viewBox height');
    this.coordinateBox = [x, y, width, height];
  }
  importRootAttribute(name: string, value: string): void {
    if (name === 'id') {
      Shape.validateText(value);
      if (!value || /\s/.test(value)) throw new Error('invalid root id');
      this.ensureAvailable(value);
      this.rootId = value;
    } else this.appearance.importAttribute(name, value);
  }
  rootAttributes(): readonly [string, string][] {
    return [...(this.rootId ? [['id', this.rootId] as [string, string]] : []),
      ...this.appearance.attributes().filter(([name]) => name !== 'id')];
  }
  resize(width: number, height: number): void {
    NumericValue.positive(width, 'canvas width');
    NumericValue.positive(height, 'canvas height');
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.coordinateBox = [0, 0, width, height];
  }
  allShapes(): readonly Shape[] {
    const visit = (shape: Shape): Shape[] => [shape, ...shape.children.flatMap(visit)];
    return this.children.flatMap(visit);
  }
  find(id: string): Shape {
    const shape = this.allShapes().find(item => item.id === id);
    if (!shape) throw new Error(`no such shape: ${id}`);
    return shape;
  }
  private ensureAvailable(id: string): void {
    if (id === this.rootId || this.allShapes().some(shape => shape.id === id)) throw new Error(`id already exists: ${id}`);
  }
  private collectionOf(shape: Shape): ShapeCollection { return shape.parent?.collection ?? this.content; }
  private container(id: string): GroupShape {
    const shape = this.allShapes().find(item => item.id === id);
    if (!shape) throw new Error(`no such container: ${id}`);
    return shape.asContainer();
  }
  add(shape: Shape, parentId?: string): string {
    const subtree = (node: Shape): Shape[] => [node, ...node.children.flatMap(subtree)];
    const seen = new Set<string>();
    for (const item of subtree(shape)) {
      this.ensureAvailable(item.id);
      if (seen.has(item.id)) throw new Error(`id already exists: ${item.id}`);
      seen.add(item.id);
    }
    const target = parentId === undefined ? this.content : this.container(parentId).collection;
    target.insert(shape);
    return `${shape.label} created${parentId === undefined ? '' : ` in g#${parentId}`}`;
  }
  delete(id: string): string {
    const shape = this.find(id);
    this.collectionOf(shape).remove(shape);
    return `${shape.label} deleted`;
  }
  move(id: string, dx: number, dy: number): string {
    const shape = this.find(id);
    shape.move(dx, dy);
    return `${shape.label} moved ${shape.movementSummary(dx, dy)}`;
  }
  scale(id: string, factor: number): string {
    const shape = this.find(id);
    NumericValue.positive(factor, 'scale factor');
    shape.scale(factor);
    return `${shape.label} scaled by ${factor}`;
  }
  set(id: string, attr: string, value: string): string {
    const shape = this.find(id);
    shape.setAttribute(attr, value);
    return `${shape.label} updated: ${attr}=${JSON.stringify(value)}`;
  }
  group(id: string, ids: readonly string[]): string {
    this.ensureAvailable(id);
    if (!ids.length) throw new Error('group requires at least one shape');
    if (new Set(ids).size !== ids.length) throw new Error('duplicate shape selection');
    const selected = ids.map(item => this.find(item));
    for (const outer of selected) {
      if (selected.some(inner => inner !== outer && outer.contains(inner))) {
        throw new Error(`cannot group a container into its own descendant: ${outer.id}`);
      }
    }
    // Keep document order, independently of the order in which ids were supplied.
    const ordered = this.allShapes().filter(shape => selected.includes(shape));
    const first = ordered[0]!;
    const commonParent = ordered.every(shape => shape.parent === first.parent);
    const target = commonParent ? this.collectionOf(first) : this.content;
    const rootOf = (shape: Shape): Shape => shape.parent ? rootOf(shape.parent) : shape;
    const index = Math.min(...ordered.map(shape => target.indexOf(commonParent ? shape : rootOf(shape))));
    const group = new GroupShape(id);
    for (const shape of ordered) { this.collectionOf(shape).remove(shape); group.collection.insert(shape); }
    target.insert(group, index);
    return `${group.label} created with ${ordered.length} children`;
  }
  ungroup(id: string): string {
    const group = this.find(id).asContainer();
    if (!group.parent) throw new Error(`cannot ungroup top-level container: ${id}`);
    const target = group.parent.collection;
    const index = target.indexOf(group);
    target.remove(group);
    group.children.forEach((child, offset) => { group.collection.remove(child); target.insert(child, index + offset); });
    return `${group.label} ungrouped`;
  }
  addTo(groupId: string, id: string): string {
    const group = this.container(groupId);
    const shape = this.find(id);
    if (shape.contains(group)) throw new Error(`cannot move a container into its own descendant: ${id}`);
    this.collectionOf(shape).remove(shape);
    group.collection.insert(shape);
    return `${shape.label} moved into ${group.label}`;
  }
  reorder(id: string, front: boolean): string {
    const shape = this.find(id);
    const siblings = this.collectionOf(shape);
    siblings.remove(shape);
    siblings.insert(shape, front ? siblings.all.length : 0);
    return `${shape.label} sent to ${front ? 'front' : 'back'}`;
  }
  clone(): Canvas {
    const copy = new Canvas(this.width, this.height);
    copy.coordinateBox = [...this.coordinateBox];
    for (const [name, value] of this.rootAttributes()) copy.importRootAttribute(name, value);
    for (const child of this.children) copy.content.insert(child.clone());
    return copy;
  }
}
