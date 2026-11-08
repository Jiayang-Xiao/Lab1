import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Editor } from '../src/application/Editor';
import { CreateCommand } from '../src/application/commands/CreateCommand';
import { MoveCommand } from '../src/application/commands/MoveCommand';
import { GroupCommand } from '../src/application/commands/GroupCommand';
import { DeleteCommand } from '../src/application/commands/DeleteCommand';
import { ScaleCommand } from '../src/application/commands/ScaleCommand';
import { MemoryFileStore } from './support/MemoryFileStore';

const editor = (): Editor => new Editor(new MemoryFileStore(), {
  encode: () => '<svg/>', decode: () => { throw new Error('test fixture does not decode'); },
});

test('失败编辑保留原文档与 redo；成功新编辑清空 redo', () => {
  const app = editor();
  app.init();
  app.apply(new CreateCommand('rect', 'r', ['1', '2', '3', '4']));
  app.apply(new MoveCommand('r', 10, 20));
  app.undo();
  assert.throws(() => app.apply(new ScaleCommand('r', -1)), /scale factor must be positive/);
  app.redo();
  assert.equal(app.document.find('r').positionSummary(), '(11,22)');
  app.undo();
  app.apply(new MoveCommand('r', 1, 1));
  assert.throws(() => app.redo(), /nothing to redo/);
});

test('group 与删除整棵子树都只占一个撤销单元', () => {
  const app = editor();
  app.init();
  app.apply(new CreateCommand('circle', 'a', ['1', '2', '3']));
  app.apply(new CreateCommand('circle', 'b', ['4', '5', '6']));
  app.apply(new GroupCommand('g', ['a', 'b']));
  app.undo();
  assert.deepEqual(app.document.children.map(s => s.id), ['a', 'b']);
  app.redo();
  app.apply(new DeleteCommand('g'));
  assert.equal(app.document.allShapes().length, 0);
  app.undo();
  assert.deepEqual(app.document.find('g').children.map(s => s.id), ['a', 'b']);
});

test('部分子孙已完成运算后遇到浮点溢出，整条命令仍原子失败', () => {
  const app = editor();
  app.init();
  app.apply(new CreateCommand('g', 'g', []));
  app.apply(new CreateCommand('circle', 'a', ['1', '2', '3'], 'g'));
  app.apply(new CreateCommand('circle', 'b', ['1e308', '2', '3'], 'g'));
  assert.throws(() => app.apply(new ScaleCommand('g', 10)), /finite number/);
  assert.equal(app.document.find('a').positionSummary(), '(1,2)');
  app.undo();
  assert.throws(() => app.document.find('b'), /no such shape/);
});

test('成功 IO 形成屏障，失败 IO 保留历史；下一条编辑重新解禁', () => {
  const app = editor();
  app.init();
  assert.throws(() => app.undo(), /undo not allowed after io command/);
  app.apply(new CreateCommand('g', 'g', []));
  assert.throws(() => app.read('missing.svg'), /cannot read file/);
  app.undo();
  app.redo();
  app.save('a.svg');
  assert.throws(() => app.redo(), /undo not allowed after io command/);
  app.apply(new CreateCommand('g', 'next', []));
  app.undo();
  assert.throws(() => app.undo(), /nothing to undo/);
});
