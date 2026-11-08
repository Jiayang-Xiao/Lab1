import { Canvas } from '../../domain/Canvas';

export abstract class EditCommand {
  private before: Canvas | undefined;
  private after: Canvas | undefined;
  private message = '';
  get summary(): string { return this.message; }
  protected abstract perform(document: Canvas): string;
  execute(document: Canvas): Canvas {
    const before = document.clone();
    const candidate = document.clone();
    const message = this.perform(candidate);
    this.before = before;
    this.after = candidate.clone();
    this.message = message;
    return candidate;
  }
  undo(): Canvas {
    if (!this.before) throw new Error('command has not executed');
    return this.before.clone();
  }
  redo(): Canvas {
    if (!this.after) throw new Error('command has not executed');
    return this.after.clone();
  }
}
