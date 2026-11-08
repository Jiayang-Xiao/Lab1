import { randomUUID } from 'node:crypto';
import { readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { FileStore } from '../application/ports/FileStore';

export class NodeFileStore implements FileStore {
  read(path: string): string { return readFileSync(path, 'utf8'); }
  write(path: string, content: string): void {
    const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
    try {
      writeFileSync(temporary, content, { encoding: 'utf8', flag: 'wx' });
      renameSync(temporary, path);
    } finally {
      try { unlinkSync(temporary); } catch { /* Already renamed, or temporary creation failed. */ }
    }
  }
}
