import { Canvas } from '../../domain/Canvas';
import { EditCommand } from './EditCommand';

export class SetCommand extends EditCommand {
  constructor(private readonly id: string, private readonly attr: string, private readonly value: string) { super(); }
  protected perform(document: Canvas): string { return document.set(this.id, this.attr, this.value); }
}
