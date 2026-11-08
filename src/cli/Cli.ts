import { createInterface } from 'node:readline';
import { Readable, Writable } from 'node:stream';
import { CliSession } from './CliSession';

export class Cli {
  constructor(private readonly session: CliSession) {}
  async run(input: Readable, output: Writable, interactive = false): Promise<boolean> {
    const lines = createInterface({ input, output, terminal: interactive, crlfDelay: Infinity });
    output.write("svg-editor 0.1 — type 'help' for commands\n");
    lines.setPrompt('svg> ');
    if (interactive) lines.prompt();
    let failed = false;
    for await (const line of lines) {
      const result = this.session.execute(line);
      for (const message of result) output.write(`${message}\n`);
      failed ||= result.some(message => message.startsWith('error:'));
      if (interactive) lines.prompt();
    }
    return failed;
  }
}
