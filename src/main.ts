import { createReadStream } from 'node:fs';
import { Editor } from './application/Editor';
import { Cli } from './cli/Cli';
import { CliSession } from './cli/CliSession';
import { NodeFileStore } from './infrastructure/NodeFileStore';
import { SvgCodec } from './infrastructure/SvgCodec';

const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--script')) {
  process.stderr.write('error: usage: npm run cli -- [--script <commands.txt>]\n');
  process.exitCode = 1;
} else {
  const app = new Cli(new CliSession(new Editor(new NodeFileStore(), new SvgCodec())));
  const input = args.length ? createReadStream(args[1]!, { encoding: 'utf8' }) : process.stdin;
  app.run(input, process.stdout, !args.length && !!process.stdin.isTTY).then(failed => {
    process.exitCode = failed ? 1 : 0;
  }).catch(error => {
    process.stderr.write(`error: ${args.length ? `cannot read script: ${args[1]}` : String(error).replace(/[\r\n]+/g, ' ')}\n`);
    process.exitCode = 1;
  });
}
