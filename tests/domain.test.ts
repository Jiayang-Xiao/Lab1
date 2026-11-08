import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Canvas } from '../src/domain/Canvas';
import { ShapeFactory } from '../src/domain/ShapeFactory';

test('组合多态：组内线段两个端点均平移；缩放包含位置与尺寸', () => {
  const doc = new Canvas();
  const factory = new ShapeFactory();
  doc.add(factory.create('g', 'g', []));
  doc.add(factory.create('line', 'l', ['1', '2', '3', '4']), 'g');
  doc.add(factory.create('rect', 'r', ['2', '3', '4', '5']), 'g');
  doc.move('g', 10, 20);
  doc.scale('g', 2);
  assert.equal(doc.find('l').geometrySummary(), '(22,44) -> (26,48)');
  assert.equal(doc.find('r').geometrySummary(), 'x=24 y=46 w=8 h=10');
});

test('分组保持文档顺序；嵌套 ungroup 恢复原位置', () => {
  const doc = new Canvas();
  const factory = new ShapeFactory();
  doc.add(factory.create('g', 'scene', []));
  for (const id of ['a', 'b', 'c', 'd']) doc.add(factory.create('circle', id, ['1', '2', '3']), 'scene');
  doc.group('pair', ['c', 'a']);
  assert.deepEqual(doc.find('pair').children.map(s => s.id), ['a', 'c']);
  assert.deepEqual(doc.find('scene').children.map(s => s.id), ['pair', 'b', 'd']);
  doc.ungroup('pair');
  assert.deepEqual(doc.find('scene').children.map(s => s.id), ['a', 'c', 'b', 'd']);
});

test('深拷贝隔离树、样式和文字；父引用指向副本', () => {
  const doc = new Canvas();
  const factory = new ShapeFactory();
  doc.add(factory.create('g', 'g', []));
  doc.add(factory.create('text', 't', ['1', '2', 'hello']), 'g');
  const copy = doc.clone();
  copy.set('t', 'text', 'changed');
  copy.set('g', 'fill', 'red');
  assert.equal(doc.find('t').textContent, 'hello');
  assert.equal(doc.find('g').paintSummary(), '');
  assert.equal(copy.find('t').parent, copy.find('g'));
  assert.notEqual(copy.find('t').parent, doc.find('g'));
});
