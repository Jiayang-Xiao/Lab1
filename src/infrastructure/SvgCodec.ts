import { DOMImplementation, DOMParser, XMLSerializer } from '@xmldom/xmldom';
import type { Document, Element, Node } from '@xmldom/xmldom';
import { DocumentCodec } from '../application/ports/DocumentCodec';
import { Canvas } from '../domain/Canvas';
import { NumericValue } from '../domain/NumericValue';
import { Shape } from '../domain/Shape';
import { ShapeFactory } from '../domain/ShapeFactory';
import { SvgTransform } from './SvgTransform';

export class SvgCodec implements DocumentCodec {
  private static readonly namespace = 'http://www.w3.org/2000/svg';
  private readonly factory = new ShapeFactory();

  encode(canvas: Canvas): string {
    const document = new DOMImplementation().createDocument(SvgCodec.namespace, 'svg', null);
    const root = document.documentElement!;
    root.setAttribute('width', String(canvas.width));
    root.setAttribute('height', String(canvas.height));
    root.setAttribute('viewBox', canvas.viewBox);
    for (const [name, value] of canvas.rootAttributes()) root.setAttribute(name, value);
    for (const shape of canvas.children) {
      root.appendChild(document.createTextNode('\n  '));
      root.appendChild(this.writeShape(document, shape, 1));
    }
    if (canvas.children.length) root.appendChild(document.createTextNode('\n'));
    return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(document)}\n`;
  }
  private writeShape(document: Document, shape: Shape, depth: number): Element {
    const element = document.createElementNS(SvgCodec.namespace, shape.tag);
    for (const [name, value] of shape.attributes()) element.setAttribute(name, value);
    if (shape.textContent !== undefined) element.appendChild(document.createTextNode(shape.textContent));
    for (const child of shape.children) {
      element.appendChild(document.createTextNode(`\n${'  '.repeat(depth + 1)}`));
      element.appendChild(this.writeShape(document, child, depth + 1));
    }
    if (shape.children.length) element.appendChild(document.createTextNode(`\n${'  '.repeat(depth)}`));
    return element;
  }
  decode(content: string): { document: Canvas; warnings: readonly string[] } {
    Shape.validateText(content);
    if (/<!DOCTYPE|<!ENTITY/i.test(content)) throw new Error('invalid SVG: DTD and entities are not supported');
    const parser = new DOMParser({ onError: (_level, message) => { throw new Error(`invalid SVG: ${message}`); } });
    const xml = parser.parseFromString(content, 'application/xml');
    const root = xml.documentElement;
    if (!root || root.localName !== 'svg') throw new Error('invalid SVG: root element must be svg');
    this.checkNamespace(root);
    const viewBox = root.hasAttribute('viewBox')
      ? root.getAttribute('viewBox')!.trim().split(/[\s,]+/).map(v => NumericValue.parse(v, 'viewBox')) : undefined;
    if (viewBox && viewBox.length !== 4) throw new Error('invalid SVG: viewBox requires four numbers');
    const width = root.hasAttribute('width') ? this.dimension(root.getAttribute('width')!, 'canvas width') : viewBox?.[2] ?? 800;
    const height = root.hasAttribute('height') ? this.dimension(root.getAttribute('height')!, 'canvas height') : viewBox?.[3] ?? 600;
    const canvas = new Canvas(width, height);
    if (viewBox) canvas.setViewBox(viewBox[0]!, viewBox[1]!, viewBox[2]!, viewBox[3]!);
    for (const attr of Array.from(root.attributes)) {
      if (['width', 'height', 'viewBox', 'version', 'transform'].includes(attr.name) || this.isNamespace(attr.name)) continue;
      canvas.importRootAttribute(attr.name, attr.value);
    }
    const elements = this.elementChildren(root);
    const reserved = new Set<string>();
    const reserve = (element: Element): void => {
      const id = element.getAttribute('id');
      if (id) {
        if (reserved.has(id)) throw new Error(`id already exists: ${id}`);
        reserved.add(id);
      }
      for (const child of this.elementChildren(element)) reserve(child);
    };
    reserve(root);
    const warnings: string[] = [];
    const counters = new Map<string, number>();
    const transform = SvgTransform.parse(root.getAttribute('transform') ?? '');
    for (const element of elements) canvas.add(this.readShape(element, reserved, counters, warnings, transform,
      root.getAttribute('stroke-width') ?? '1', root.getAttribute('font-size') ?? '16'));
    this.checkText(root);
    return { document: canvas, warnings };
  }
  private readShape(element: Element, reserved: Set<string>, counters: Map<string, number>, warnings: string[],
    parentTransform: SvgTransform, parentStroke: string, parentFont: string): Shape {
    this.checkNamespace(element);
    const type = element.localName ?? element.tagName;
    let id = element.getAttribute('id');
    if (!id) {
      let number = counters.get(type) ?? 0;
      do { number++; id = `${type}${number}`; } while (reserved.has(id));
      counters.set(type, number);
      reserved.add(id);
      warnings.push(`warning: assigned id ${id} to unnamed <${type}>`);
    }
    const shape = this.factory.empty(type, id);
    const transform = parentTransform.compose(SvgTransform.parse(element.getAttribute('transform') ?? ''));
    const stroke = element.getAttribute('stroke-width') ?? parentStroke;
    const font = element.getAttribute('font-size') ?? parentFont;
    for (const attr of Array.from(element.attributes)) {
      if (attr.name === 'id' || attr.name === 'transform' || this.isNamespace(attr.name)) continue;
      shape.importAttribute(attr.name, attr.value);
    }
    if (shape.textContent !== undefined) shape.setAttribute('text', element.textContent ?? '');
    else this.checkText(element);
    const children = this.elementChildren(element);
    if (children.length) {
      const group = shape.asContainer();
      for (const child of children) group.collection.insert(this.readShape(child, reserved, counters, warnings, transform, stroke, font));
    }
    transform.apply(shape, stroke, font);
    return shape;
  }
  private elementChildren(node: Node): Element[] {
    return Array.from(node.childNodes).filter((child): child is Element => child.nodeType === 1);
  }
  private checkNamespace(element: Element): void {
    if (element.namespaceURI && element.namespaceURI !== SvgCodec.namespace) throw new Error(`unsupported SVG namespace: ${element.namespaceURI}`);
  }
  private isNamespace(name: string): boolean { return name === 'xmlns' || name.startsWith('xmlns:'); }
  private dimension(value: string, label: string): number { return NumericValue.parse(value.trim().replace(/px$/, ''), label); }
  private checkText(element: Element): void {
    for (const node of Array.from(element.childNodes)) {
      if ((node.nodeType === 3 || node.nodeType === 4) && node.nodeValue?.trim()) {
        throw new Error(`invalid SVG: unexpected text in <${element.localName}>`);
      }
    }
  }
}
