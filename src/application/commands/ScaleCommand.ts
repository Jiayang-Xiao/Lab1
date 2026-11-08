import { Canvas } from '../../domain/Canvas';
import { EditCommand } from './EditCommand';

export class ScaleCommand extends EditCommand {
  constructor(private readonly id: string, private readonly factor: number) { super(); }
  protected perform(document: Canvas): string { return document.scale(this.id, this.factor); }
}
