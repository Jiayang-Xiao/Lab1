import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Editor } from '../src/application/Editor';
import { CliSession } from '../src/cli/CliSession';
import { SvgCodec } from '../src/infrastructure/SvgCodec';
import { MemoryFileStore } from './support/MemoryFileStore';

const setup = () => {
  const codec = new SvgCodec();
  const editor = new Editor(new MemoryFileStore(), codec);
  const cli = new CliSession(editor);
  for (const line of ['init', 'create g scene', 'create circle lead 1 2 3 in scene',
    'create g nested in scene', 'create rect a 1 2 3 4 in nested',
    'create text b 5 6 "文字" in nested', 'create ellipse tail 1 2 3 4 in scene',
    'create line outside 1 2 3 4 black']) assert.doesNotMatch(cli.execute(line)[0]!, /^error:/);
  return { cli, editor, snapshot: () => codec.encode(editor.document) };
};

for (const command of ['create circle c 10 20 5 in nested', 'delete nested', 'move scene 10.5 -3',
  'scale scene 0.5', 'set nested fill red', 'group bundle b a', 'ungroup nested',
  'addto scene outside', 'front lead', 'back tail']) {
  test(`每项编辑独立 undo/redo，恢复属性、父级及顺序：${command}`, () => {
    const { cli, snapshot } = setup();
    const before = snapshot();
    assert.doesNotMatch(cli.execute(command)[0]!, /^error:/);
    const after = snapshot();
    assert.notEqual(after, before);
    cli.execute('undo');
    assert.equal(snapshot(), before);
    cli.execute('redo');
    assert.equal(snapshot(), after);
  });
}

test('front 对应 SVG 后绘制，back 对应先绘制；只影响同级', () => {
  const { cli, editor } = setup();
  cli.execute('front lead');
  assert.deepEqual(editor.document.find('scene').children.map(s => s.id), ['nested', 'tail', 'lead']);
  cli.execute('back tail');
  assert.deepEqual(editor.document.find('scene').children.map(s => s.id), ['tail', 'nested', 'lead']);
  assert.deepEqual(editor.document.children.map(s => s.id), ['scene', 'outside']);
});

test('跨父级 group 在根级插入，按原文档深度优先顺序收编', () => {
  const { cli, editor } = setup();
  cli.execute('group mixed outside b lead');
  assert.deepEqual(editor.document.find('mixed').children.map(s => s.id), ['lead', 'b', 'outside']);
  assert.deepEqual(editor.document.children.map(s => s.id), ['mixed', 'scene']);
  assert.deepEqual(editor.document.find('nested').children.map(s => s.id), ['a']);
});

test('set 支持每种几何、公共样式与组继承，scale 不改笔画宽度', () => {
  const { cli, editor } = setup();
  for (const command of ['set a x -1', 'set a y 2.5', 'set a width 9', 'set a height 8',
    'set lead cx 10', 'set lead cy 11', 'set lead r 12',
    'set tail cx 13', 'set tail cy 14', 'set tail rx 15', 'set tail ry 16',
    'set outside x1 17', 'set outside y1 18', 'set outside x2 19', 'set outside y2 20',
    'set b x 21', 'set b y 22', 'set b text "new text"',
    'set scene fill red', 'set scene stroke blue', 'set scene stroke-width 3']) {
    assert.doesNotMatch(cli.execute(command)[0]!, /^error:/, command);
  }
  cli.execute('scale scene 2');
  assert.match(cli.execute('show a').join('\n'), /x=-2 y=5 width=18 height=16/);
  assert.match(cli.execute('show lead').join('\n'), /cx=20 cy=22 r=24/);
  assert.match(cli.execute('show tail').join('\n'), /cx=26 cy=28 rx=30 ry=32/);
  assert.equal(editor.document.find('b').textContent, 'new text');
  assert.match(cli.execute('show scene').join('\n'), /stroke-width=3/);
  assert.match(cli.execute('show outside').join('\n'), /x1=17 x2=19 y1=18 y2=20/);
});
