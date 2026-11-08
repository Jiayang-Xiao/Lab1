import { Canvas } from '../domain/Canvas';
import { EditCommand } from './commands/EditCommand';

export class CommandHistory {
  private readonly past: EditCommand[] = [];
  private readonly future: EditCommand[] = [];
  private blocked = false;
  execute(command: EditCommand, document: Canvas): Canvas {
    const result = command.execute(document);
    this.past.push(command);
    this.future.length = 0;
    this.blocked = false;
    return result;
  }
  barrier(): void { this.past.length = 0; this.future.length = 0; this.blocked = true; }
  undo(): { document: Canvas; message: string } {
    if (this.blocked) throw new Error('undo not allowed after io command');
    const command = this.past.at(-1);
    if (!command) throw new Error('nothing to undo');
    const document = command.undo();
    this.past.pop();
    this.future.push(command);
    return { document, message: `undone: ${command.summary}` };
  }
  redo(): { document: Canvas; message: string } {
    if (this.blocked) throw new Error('undo not allowed after io command');
    const command = this.future.at(-1);
    if (!command) throw new Error('nothing to redo');
    const document = command.redo();
    this.future.pop();
    this.past.push(command);
    return { document, message: `redone: ${command.summary}` };
  }
}
