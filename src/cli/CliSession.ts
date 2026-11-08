import { Editor } from '../application/Editor';
import { CommandDispatcher } from './CommandDispatcher';
import { Tokenizer } from './Tokenizer';

export class CliSession {
  private readonly tokenizer = new Tokenizer();
  private readonly dispatcher: CommandDispatcher;
  constructor(editor: Editor) { this.dispatcher = new CommandDispatcher(editor); }
  execute(line: string): readonly string[] {
    try { return this.dispatcher.dispatch(this.tokenizer.tokenize(line)); }
    catch (error) {
      return [`error: ${(error instanceof Error ? error.message : String(error)).replace(/[\r\n]+/g, ' ')}`];
    }
  }
}
