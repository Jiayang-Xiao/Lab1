import { Canvas } from '../../domain/Canvas';
import { ShapeFactory } from '../../domain/ShapeFactory';
import { EditCommand } from './EditCommand';

export class CreateCommand extends EditCommand {
  constructor(private readonly type: string, private readonly id: string,
    private readonly args: readonly string[], private readonly parentId?: string) { super(); }
  protected perform(document: Canvas): string {
    return document.add(new ShapeFactory().create(this.type, this.id, this.args), this.parentId);
  }
}
