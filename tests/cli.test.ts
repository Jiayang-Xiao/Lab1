import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Editor } from '../src/application/Editor';
import { CliSession } from '../src/cli/CliSession';
import { SvgCodec } from '../src/infrastructure/SvgCodec';
import { Tokenizer } from '../src/cli/Tokenizer';
import { MemoryFileStore } from './support/MemoryFileStore';

const setup = () => {
  const files = new MemoryFileStore();
  const cli = new CliSession(new Editor(files, new SvgCodec()));
  return { cli, files };
};

test('分词保留空字符串、引号转义、Windows 路径、颜色与带 in 的文本', () => {
  const tokenizer = new Tokenizer();
  assert.deepEqual(tokenizer.tokenize('  # comment'), []);
  assert.deepEqual(tokenizer.tokenize(' "" "in" #fff "C:\\my path\\a.svg" "say \\"hi\\""').map(t => t.value),
    ['', 'in', '#fff', 'C:\\my path\\a.svg', 'say "hi"']);
  assert.throws(() => tokenizer.tokenize('text "unfinished'), /unterminated/);
});

test('未初始化时 help 可用，其余有效用例统一提示无文档', () => {
  const { cli } = setup();
  assert.ok(cli.execute('help').includes('undo'));
  for (const command of ['tree', 'show a', 'create g g', 'save a.svg', 'canvas', 'undo', 'redo']) {
    assert.deepEqual(cli.execute(command), ["error: no document. use 'init' or 'read' first"]);
  }
});

const failures: readonly [string, string][] = [
  ['create rect r 0 0 1 1', 'id already exists: r'],
  ['delete missing', 'no such shape: missing'],
  ['create g g in missing', 'no such container: missing'],
  ['create g g in r', 'not a container: r'],
  ['create hexagon h', 'unknown shape type: hexagon (is the plugin loaded?)'],
  ['create box b 1 2 3 4 "title"', 'unknown shape type: box (is the plugin loaded?)'],
  ['group bad r scene', 'cannot group a container into its own descendant: scene'],
  ['ungroup scene', 'cannot ungroup top-level container: scene'],
  ['scale r 0', 'scale factor must be positive'],
  ['scale r -1', 'scale factor must be positive'],
  ['set r id changed', 'unknown attribute: id'],
  ['set scene x 1', 'unknown attribute: x'],
  ['addto scene scene', 'cannot move a container into its own descendant: scene'],
  ['addto nested scene', 'cannot move a container into its own descendant: scene'],
];
for (const [command, error] of failures) {
  test(`错误约定且状态不变：${command}`, () => {
    const { cli } = setup();
    for (const line of ['init', 'create g scene', 'create g nested in scene', 'create rect r 1 2 3 4 in scene']) cli.execute(line);
    const before = cli.execute('tree');
    assert.deepEqual(cli.execute(command), [`error: ${error}`]);
    assert.deepEqual(cli.execute('tree'), before);
    cli.execute('undo');
    assert.deepEqual(cli.execute('show r'), ['error: no such shape: r']);
  });
}

for (const command of [
  'create rect bad NaN 0 1 1', 'create rect bad 0 0 -1 1', 'create circle bad 0 0 -1',
  'create ellipse bad 0 0 1 -1', 'create line bad 0 1 2 Infinity', 'move r 1e999 0',
  'set r width -1', 'set r stroke-width -1', 'scale r NaN', 'group bad r r',
  'create g ""', 'create g "space id"', 'create rect bad 0 0 1',
  'canvas 10', 'canvas 0 10', 'init 0 10', 'move r 1', 'tree r extra', 'undo extra',
  'set r fill "unterminated',
]) {
  test(`非法参数失败保留历史：${command}`, () => {
    const { cli } = setup();
    cli.execute('init');
    cli.execute('create rect r 1 2 3 4');
    cli.execute('move r 10 20');
    cli.execute('undo');
    const before = cli.execute('tree');
    assert.match(cli.execute(command)[0]!, /^error: [^\r\n]+$/);
    assert.deepEqual(cli.execute('tree'), before);
    cli.execute('redo');
    assert.match(cli.execute('show r').join('\n'), /x=11 y=22/);
  });
}

test('所有类型支持 in，id 大小写敏感且全树唯一', () => {
  const { cli } = setup();
  for (const line of ['init', 'create g scene', 'create g nested in scene',
    'create rect a 0 0 1 1 in nested', 'create circle A 0 0 1 in nested',
    'create ellipse e 0 0 1 2 in nested', 'create line l 1 2 3 4 in nested',
    'create text t 0 0 "in" in nested']) assert.doesNotMatch(cli.execute(line)[0]!, /^error:/);
  assert.deepEqual(cli.execute('create g a'), ['error: id already exists: a']);
  assert.match(cli.execute('show t').join('\n'), /parent=g#nested/);
  assert.match(cli.execute('show t').join('\n'), /text="in"/);
  assert.equal(cli.execute('tree nested').length, 6);
});

test('显示和注释不入栈，canvas 查询不设屏障，修改尺寸设屏障', () => {
  const { cli } = setup();
  cli.execute('init');
  cli.execute('create g g');
  for (const line of ['tree', 'tree g', 'show g', 'help', 'canvas', '# comment', '  ']) cli.execute(line);
  cli.execute('undo');
  assert.deepEqual(cli.execute('tree'), ['svg (800x600)']);
  cli.execute('redo');
  cli.execute('canvas 300.5 200');
  assert.deepEqual(cli.execute('canvas'), ['canvas 300.5x200']);
  assert.deepEqual(cli.execute('undo'), ['error: undo not allowed after io command']);
  cli.execute('create g next');
  assert.doesNotMatch(cli.execute('undo')[0]!, /^error:/);
  assert.deepEqual(cli.execute('tree'), ['svg (300.5x200)', '└── g#g']);
});

test('失败的 read/save 不清除 redo，也不更改默认保存路径', () => {
  const { cli, files } = setup();
  cli.execute('init');
  cli.execute('create g a');
  cli.execute('save "path with spaces.svg"');
  cli.execute('create g b');
  cli.execute('undo');
  assert.deepEqual(cli.execute('read missing.svg'), ['error: cannot read file: missing.svg']);
  files.write('bad.svg', '<svg><rect></svg>');
  assert.match(cli.execute('read bad.svg')[0]!, /^error:/);
  cli.execute('redo');
  assert.match(cli.execute('tree').join('\n'), /g#b/);
  cli.execute('save');
  assert.match(files.read('path with spaces.svg'), /id="b"/);
});

test('空文字、引号和中文往返，in 内容不被误解析为归属', () => {
  const { cli } = setup();
  for (const line of ['init', 'create text a 1 2 "in"', 'create text b 1 2 ""', 'set a text "中文 <&> \\"quote\\""', 'save text.svg', 'read text.svg']) {
    assert.doesNotMatch(cli.execute(line)[0]!, /^error:/);
  }
  assert.match(cli.execute('show a').join('\n'), /中文 <&>/);
  assert.match(cli.execute('show b').join('\n'), /text=""/);
});
