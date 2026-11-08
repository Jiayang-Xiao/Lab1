import { Canvas } from '../domain/Canvas';
import { CommandHistory } from './CommandHistory';
import { EditCommand } from './commands/EditCommand';
import { DocumentCodec } from './ports/DocumentCodec';
import { FileStore } from './ports/FileStore';

export class Editor {
  private current: Canvas | undefined;
  private filename: string | undefined;
  private readonly history = new CommandHistory();
  constructor(private readonly files: FileStore, private readonly codec: DocumentCodec) {}
  get document(): Canvas {
    if (!this.current) throw new Error("no document. use 'init' or 'read' first");
    return this.current;
  }
  init(width = 800, height = 600): string {
    const document = new Canvas(width, height);
    this.current = document;
    this.filename = undefined;
    this.history.barrier();
    return `canvas ${width}x${height} created`;
  }
  resize(width: number, height: number): string {
    const candidate = this.document.clone();
    candidate.resize(width, height);
    this.current = candidate;
    this.history.barrier();
    return `canvas resized to ${width}x${height}`;
  }
  apply(command: EditCommand): string {
    this.current = this.history.execute(command, this.document);
    return command.summary;
  }
  undo(): string {
    void this.document;
    const result = this.history.undo();
    this.current = result.document;
    return result.message;
  }
  redo(): string {
    void this.document;
    const result = this.history.redo();
    this.current = result.document;
    return result.message;
  }
  read(path: string): readonly string[] {
    let content: string;
    try { content = this.files.read(path); }
    catch { throw new Error(`cannot read file: ${path}`); }
    const decoded = this.codec.decode(content);
    this.current = decoded.document;
    this.filename = path;
    this.history.barrier();
    return [...decoded.warnings, `read ${path} (${this.document.allShapes().length} elements)`];
  }
  save(path = this.filename): string {
    const document = this.document;
    if (!path) throw new Error('no file path. use save <file.svg>');
    const content = this.codec.encode(document);
    try { this.files.write(path, content); }
    catch { throw new Error(`cannot write file: ${path}`); }
    this.filename = path;
    this.history.barrier();
    return `saved to ${path} (${document.allShapes().length} elements)`;
  }
}
