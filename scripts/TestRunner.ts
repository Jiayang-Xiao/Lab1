import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

class TestRunner {
  run(): void {
    const directory = resolve(__dirname, '../tests');
    const files = readdirSync(directory).filter(name => name.endsWith('.test.js')).sort().map(name => resolve(directory, name));
    if (!files.length) throw new Error('no compiled tests found');
    const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  }
}

new TestRunner().run();
