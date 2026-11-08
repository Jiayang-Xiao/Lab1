import { FileStore } from '../../src/application/ports/FileStore';

export class MemoryFileStore implements FileStore {
  private readonly files = new Map<string, string>();
  read(path: string): string {
    const content = this.files.get(path);
    if (content === undefined) throw new Error('missing file');
    return content;
  }
  write(path: string, content: string): void { this.files.set(path, content); }
}
