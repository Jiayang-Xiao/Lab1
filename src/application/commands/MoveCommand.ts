import { Canvas } from '../../domain/Canvas';
import { EditCommand } from './EditCommand';

export class MoveCommand extends EditCommand {
  constructor(private readonly id: string, private readonly dx: number, private readonly dy: number) { super(); }
  protected perform(document: Canvas): string { return document.move(this.id, this.dx, this.dy); }
}
