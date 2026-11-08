import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';

test('架构规则：依赖单向、XML/文件 IO 隔离、一类一文件、无 switch 分发', () => {
  const root = resolve('src');
  const allowed = new Map<string, readonly string[]>([
    ['domain', []], ['application', ['domain']], ['cli', ['application', 'domain']],
    ['infrastructure', ['application', 'domain']],
  ]);
  const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true })
    .flatMap(entry => entry.isDirectory() ? files(join(dir, entry.name)) : entry.name.endsWith('.ts') ? [join(dir, entry.name)] : []);
  for (const path of files(root)) {
    const module = relative(root, path).split(/[\\/]/)[0]!;
    const ast = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
    const classes = ast.statements.filter(ts.isClassDeclaration);
    assert.ok(classes.length <= 1, path);
    if (classes.length) assert.equal(classes[0]!.name?.text, basename(path, '.ts'), path);
    assert.ok(!ast.statements.some(ts.isFunctionDeclaration), `top-level free function: ${path}`);
    const visit = (node: ts.Node): void => {
      assert.ok(!ts.isSwitchStatement(node), `switch: ${path}`);
      ts.forEachChild(node, visit);
    };
    visit(ast);
    for (const node of ast.statements.filter(ts.isImportDeclaration)) {
      const name = (node.moduleSpecifier as ts.StringLiteral).text;
      if (name.startsWith('.')) {
        const target = relative(root, resolve(dirname(path), name)).split(/[\\/]/)[0]!;
        if (module !== 'main.ts' && target !== module) assert.ok(allowed.get(module)?.includes(target), `${path} -> ${name}`);
      } else if (module === 'domain' || module === 'application') {
        assert.fail(`inner layer external dependency: ${path} -> ${name}`);
      } else if (name === '@xmldom/xmldom') assert.equal(module, 'infrastructure');
    }
  }
});
