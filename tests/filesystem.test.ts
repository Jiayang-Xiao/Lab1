import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { Editor } from '../src/application/Editor';
import { CreateCommand } from '../src/application/commands/CreateCommand';
import { NodeFileStore } from '../src/infrastructure/NodeFileStore';
import { SvgCodec } from '../src/infrastructure/SvgCodec';

test('真实文件：保存覆盖、默认路径、写入失败保留历史并清除临时文件', t => {
  const folder = mkdtempSync(join(tmpdir(), 'lab1-files-'));
  t.after(() => {
    assert.equal(realpathSync(dirname(folder)), realpathSync(tmpdir()));
    assert.ok(basename(folder).startsWith('lab1-files-'));
    rmSync(folder, { recursive: true, force: true });
  });
  const app = new Editor(new NodeFileStore(), new SvgCodec());
  const path = join(folder, '含 空格.svg');
  app.init();
  app.apply(new CreateCommand('g', 'a', []));
  app.save(path);
  app.apply(new CreateCommand('g', 'b', []));
  app.save();
  assert.match(readFileSync(path, 'utf8'), /id="b"/);
  const blocked = join(folder, 'directory.svg');
  mkdirSync(blocked);
  app.apply(new CreateCommand('g', 'c', []));
  app.undo();
  assert.throws(() => app.save(blocked), /cannot write file:/);
  app.redo();
  app.save();
  assert.match(readFileSync(path, 'utf8'), /id="c"/);
  assert.deepEqual(readdirSync(folder).sort(), ['directory.svg', '含 空格.svg'].sort());
});

test('真实 CLI 进程：脚本与标准输入、中文/空格路径、错误退出码', t => {
  const folder = mkdtempSync(join(tmpdir(), 'lab1-cli-'));
  t.after(() => {
    assert.equal(realpathSync(dirname(folder)), realpathSync(tmpdir()));
    assert.ok(basename(folder).startsWith('lab1-cli-'));
    rmSync(folder, { recursive: true, force: true });
  });
  const main = resolve('dist/src/main.js');
  const script = join(folder, '命令 回放.txt');
  writeFileSync(script, '# comment\ninit 200 100\ncreate text t 1 20 "中文 hello"\nsave "结果 文件.svg"\nread "结果 文件.svg"\nshow t\n', 'utf8');
  const replay = spawnSync(process.execPath, [main, '--script', script], { cwd: folder, encoding: 'utf8', timeout: 10000 });
  assert.equal(replay.status, 0, replay.stderr + replay.stdout);
  assert.match(replay.stdout, /中文 hello/);
  assert.match(readFileSync(join(folder, '结果 文件.svg'), 'utf8'), /中文 hello/);
  const invalid = spawnSync(process.execPath, [main], { input: 'init\ncreate box b\ntree\n', encoding: 'utf8', timeout: 10000 });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stdout, /error: unknown shape type: box/);
  assert.match(invalid.stdout, /svg \(800x600\)/);
  const missing = spawnSync(process.execPath, [main, '--script', join(folder, 'missing.txt')], { encoding: 'utf8', timeout: 10000 });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /error: cannot read script:/);
});
