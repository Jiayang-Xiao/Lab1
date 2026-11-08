import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SvgCodec } from '../src/infrastructure/SvgCodec';
import { Canvas } from '../src/domain/Canvas';
import { ShapeFactory } from '../src/domain/ShapeFactory';

test('文字及属性通过真正的 XML 转义往返，省略的 paint 不自动填默认值', () => {
  const codec = new SvgCodec();
  const doc = new Canvas(400, 200);
  const factory = new ShapeFactory();
  doc.add(factory.create('text', '中文-id', ['1.5', '2', '中 < & > " 😀']));
  doc.add(factory.create('rect', 'r', ['0', '0', '10', '20']));
  const svg = codec.encode(doc);
  assert.match(svg, /&lt;/);
  assert.match(svg, /&amp;/);
  assert.doesNotMatch(svg, /fill=/);
  const decoded = codec.decode(svg).document;
  assert.equal(decoded.find('中文-id').textContent, '中 < & > " 😀');
  assert.equal(codec.encode(decoded), svg);
});

test('先预留全文显式 id，再自动命名；不和后续元素碰撞', () => {
  const result = new SvgCodec().decode('<svg width="10" height="20"><rect/><rect id="rect1"/><g><circle/></g></svg>');
  assert.deepEqual(result.document.allShapes().map(s => s.id), ['rect2', 'rect1', 'g1', 'circle1']);
  assert.deepEqual(result.warnings, [
    'warning: assigned id rect2 to unnamed <rect>',
    'warning: assigned id g1 to unnamed <g>',
    'warning: assigned id circle1 to unnamed <circle>',
  ]);
});

test('重复 id、损坏 XML、未知元素及外部实体均拒绝读入', () => {
  const codec = new SvgCodec();
  for (const xml of [
    '<svg><g id="x"><rect id="x"/></g></svg>',
    '<svg><rect></svg>',
    '<svg><path id="p"/></svg>',
    '<!DOCTYPE svg [<!ENTITY a SYSTEM "file:///secret">]><svg/>',
    '<svg><text id="t">&unknown;</text></svg>',
  ]) assert.throws(() => codec.decode(xml), xml);
});

test('外部 SVG 的 px 尺寸、根样式、独立 viewBox 和文本样式可保留', () => {
  const codec = new SvgCodec();
  const xml = '<svg xmlns="http://www.w3.org/2000/svg" width="400px" height="200px" viewBox="10 20 800 600" fill="red"><text id="t" x="1px" y="2" font-size="18" text-anchor="middle">hi</text></svg>';
  const doc = codec.decode(xml).document;
  assert.equal(doc.viewBox, '10 20 800 600');
  assert.match(codec.encode(doc), /fill="red"/);
  assert.match(codec.encode(doc), /text-anchor="middle"/);
});

test('课件中的嵌套 translate + scale 被规范化，保留文本及笔画视觉尺寸', () => {
  const codec = new SvgCodec();
  const doc = codec.decode('<svg width="400" height="200"><g id="diagram" transform="translate(60,40)" stroke="black" stroke-width="2"><rect id="a" width="120" height="60"/><g id="nodeB" transform="translate(200,0) scale(0.8)"><rect id="b" width="120" height="60"/><text id="t" x="60" y="38" font-size="16">End</text></g></g></svg>').document;
  assert.equal(doc.find('a').positionSummary(), '(60,40)');
  assert.equal(doc.find('b').geometrySummary(), 'x=260 y=40 w=96 h=48');
  assert.equal(doc.find('t').positionSummary(), '(308,70.4)');
  assert.match(doc.find('t').paintSummary(), /font-size=12.8/);
  assert.match(doc.find('b').paintSummary(), /stroke-width=1.6/);
  assert.doesNotMatch(codec.encode(doc), /transform=/);
  doc.move('nodeB', 10, 20);
  assert.equal(doc.find('b').positionSummary(), '(270,60)');
});

test('超出本阶段几何模型的旋转、非等比缩放明确报错', () => {
  const codec = new SvgCodec();
  for (const transform of ['rotate(30)', 'scale(2,3)', 'scale(-1)', 'matrix(1,0,0,1,0,0)']) {
    assert.throws(() => codec.decode(`<svg><g id="g" transform="${transform}"/></svg>`));
  }
});
