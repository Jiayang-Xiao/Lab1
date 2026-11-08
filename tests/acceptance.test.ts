import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Editor } from '../src/application/Editor';
import { CliSession } from '../src/cli/CliSession';
import { MemoryFileStore } from './support/MemoryFileStore';
import { SvgCodec } from '../src/infrastructure/SvgCodec';

test('六种图形、组合、历史屏障与 round-trip 的端到端规格', () => {
  const files = new MemoryFileStore();
  const cli = new CliSession(new Editor(files, new SvgCodec()));
  assert.deepEqual(cli.execute('init 800 600'), ['canvas 800x600 created']);
  for (const line of [
    'create g flow',
    'create rect start 120 100 160 60 #4a90d9 in flow',
    'create text label 155 135 "开始 in 流程" in flow',
    'create circle c 50 50 10 red',
    'create ellipse e 1 2 3 4',
    'create line edge 280 130 520 130 black',
  ]) assert.ok(!cli.execute(line)[0]?.startsWith('error:'), line);
  assert.match(cli.execute('tree').join('\n'), /开始 in 流程/);
  cli.execute('move flow 0 100');
  assert.match(cli.execute('show start').join('\n'), /y=200/);
  cli.execute('undo');
  assert.match(cli.execute('show start').join('\n'), /y=100/);
  cli.execute('redo');
  assert.match(cli.execute('show start').join('\n'), /y=200/);
  cli.execute('save demo.svg');
  assert.deepEqual(cli.execute('undo'), ['error: undo not allowed after io command']);
  const tree = cli.execute('tree');
  cli.execute('init');
  cli.execute('read demo.svg');
  assert.deepEqual(cli.execute('tree'), tree);
  assert.match(files.read('demo.svg'), /xmlns="http:\/\/www.w3.org\/2000\/svg"/);
});
