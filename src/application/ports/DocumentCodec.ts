import { Canvas } from '../../domain/Canvas';

export interface DocumentCodec {
  decode(content: string): { readonly document: Canvas; readonly warnings: readonly string[] };
  encode(document: Canvas): string;
}
