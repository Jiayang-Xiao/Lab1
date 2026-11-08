import { Canvas } from '../../domain/Canvas';
import { EditCommand } from './EditCommand';

export class AddToCommand extends EditCommand {
  constructor(private readonly groupId: string, private readonly id: string) { super(); }
  protected perform(document: Canvas): string { return document.addTo(this.groupId, this.id); }
}
