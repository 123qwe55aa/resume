import test from 'node:test';
import assert from 'node:assert/strict';
const core = await import('../stl/core.js').catch(() => ({}));
test('side-by-side keeps units, centers boxes and separates their bounds', () => {
  assert.equal(typeof core.layoutOffsets, 'function');
  assert.deepEqual(core.layoutOffsets([{min:[10,20,30],max:[20,40,60]}, {min:[-5,-5,-5],max:[5,5,5]}], 'side'), [[-24,-30,-45],[9,0,0]]);
});
test('overlay preserves the source coordinate relationship', () => {
  assert.equal(typeof core.layoutOffsets, 'function');
  assert.deepEqual(core.layoutOffsets([{min:[10,20,30],max:[20,40,60]}, {min:[-5,-5,-5],max:[5,5,5]}], 'overlay'), [[0,0,0],[0,0,0]]);
});
test('file validation rejects unsupported, empty and excessive files', () => {
  assert.equal(typeof core.fileError, 'function');
  assert.ok(core.fileError({name:'x.obj',size:12}));
  assert.ok(core.fileError({name:'x.stl',size:0}));
  assert.ok(core.fileError({name:'x.stl',size:101*1024*1024}));
  assert.equal(core.fileError({name:'X.STL',size:100}), null);
});
