import { Editor } from '../application/Editor';
import { AddToCommand } from '../application/commands/AddToCommand';
import { BackCommand } from '../application/commands/BackCommand';
import { CreateCommand } from '../application/commands/CreateCommand';
import { DeleteCommand } from '../application/commands/DeleteCommand';
import { FrontCommand } from '../application/commands/FrontCommand';
import { GroupCommand } from '../application/commands/GroupCommand';
import { MoveCommand } from '../application/commands/MoveCommand';
import { ScaleCommand } from '../application/commands/ScaleCommand';
import { SetCommand } from '../application/commands/SetCommand';
import { UngroupCommand } from '../application/commands/UngroupCommand';
import { ArgumentList } from './ArgumentList';
import { ShapePresenter } from './ShapePresenter';
import { Token } from './Token';

export class CommandDispatcher {
  private readonly presenter = new ShapePresenter();
  // Phase 1's single command-name dispatch site; registration is deferred to a later phase.
  private readonly commands = new Map<string, { usage: string; run: (args: ArgumentList) => readonly string[] }>();
  constructor(private readonly editor: Editor) {
    this.register('init', 'init [w] [h]', 0, 2, a => [editor.init(a.length ? a.number(0, 'width') : 800, a.length > 1 ? a.number(1, 'height') : 600)]);
    this.register('read', 'read <file.svg>', 1, 1, a => editor.read(a.at(0)));
    this.register('save', 'save [file.svg]', 0, 1, a => [editor.save(a.length ? a.at(0) : undefined)]);
    this.register('canvas', 'canvas [w] [h]', 0, 2, a => {
      if (a.length === 1) throw new Error('usage: canvas [w] [h]');
      return [a.length ? editor.resize(a.number(0, 'width'), a.number(1, 'height')) : `canvas ${editor.document.width}x${editor.document.height}`];
    });
    this.register('create', 'create <type> <id> [params…] [in <containerId>]', 2, Infinity, a => {
      const nested = a.length >= 4 && a.isKeyword(a.length - 2, 'in');
      return [editor.apply(new CreateCommand(a.at(0), a.at(1), a.values(2, nested ? a.length - 2 : a.length), nested ? a.at(a.length - 1) : undefined))];
    });
    this.register('delete', 'delete <id>', 1, 1, a => [editor.apply(new DeleteCommand(a.at(0)))]);
    this.register('move', 'move <id> <dx> <dy>', 3, 3, a => [editor.apply(new MoveCommand(a.at(0), a.number(1, 'dx'), a.number(2, 'dy')))]);
    this.register('scale', 'scale <id> <factor>', 2, 2, a => [editor.apply(new ScaleCommand(a.at(0), a.number(1, 'factor')))]);
    this.register('set', 'set <id> <attr> <value>', 3, 3, a => [editor.apply(new SetCommand(a.at(0), a.at(1), a.at(2)))]);
    this.register('group', 'group <newGid> <id1> <id2>…', 2, Infinity, a => [editor.apply(new GroupCommand(a.at(0), a.values(1)))]);
    this.register('ungroup', 'ungroup <gid>', 1, 1, a => [editor.apply(new UngroupCommand(a.at(0)))]);
    this.register('addto', 'addto <gid> <id>', 2, 2, a => [editor.apply(new AddToCommand(a.at(0), a.at(1)))]);
    this.register('front', 'front <id>', 1, 1, a => [editor.apply(new FrontCommand(a.at(0)))]);
    this.register('back', 'back <id>', 1, 1, a => [editor.apply(new BackCommand(a.at(0)))]);
    this.register('tree', 'tree [id]', 0, 1, a => this.presenter.tree(editor.document, a.length ? a.at(0) : undefined));
    this.register('show', 'show <id>', 1, 1, a => this.presenter.show(editor.document.find(a.at(0))));
    this.register('help', 'help', 0, 0, () => this.help());
    this.register('undo', 'undo', 0, 0, () => [editor.undo()]);
    this.register('redo', 'redo', 0, 0, () => [editor.redo()]);
  }
  private register(name: string, usage: string, min: number, max: number,
    run: (args: ArgumentList) => readonly string[]): void {
    this.commands.set(name, { usage, run: args => { args.require(min, max, usage); return run(args); } });
  }
  dispatch(tokens: readonly Token[]): readonly string[] {
    if (!tokens.length) return [];
    const name = tokens[0]!.value;
    const command = this.commands.get(name);
    if (!command) throw new Error(`unknown command: ${name}. type 'help' for commands`);
    if (!['init', 'read', 'help'].includes(name)) void this.editor.document;
    return command.run(new ArgumentList(tokens.slice(1)));
  }
  private help(): readonly string[] {
    return [...[...this.commands.values()].map(command => command.usage),
      'Types: rect <x> <y> <w> <h> [fill] | circle <cx> <cy> <r> [fill]',
      '       ellipse <cx> <cy> <rx> <ry> [fill] | line <x1> <y1> <x2> <y2> [stroke]',
      '       text <x> <y> "content" | g',
      '# starts a comment line. Double quotes preserve spaces. EOF exits.'];
  }
}
