import { Canvas } from '../../domain/Canvas';
import { EditCommand } from './EditCommand';

export class GroupCommand extends EditCommand {
  constructor(private readonly id: string, private readonly ids: readonly string[]) { super(); }
  protected perform(document: Canvas): string { return document.group(this.id, this.ids); }
}
