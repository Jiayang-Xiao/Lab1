import { Canvas } from '../../domain/Canvas';
import { EditCommand } from './EditCommand';

export class UngroupCommand extends EditCommand {
  constructor(private readonly id: string) { super(); }
  protected perform(document: Canvas): string { return document.ungroup(this.id); }
}
