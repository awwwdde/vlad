import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ribbonGeometry } from '../src/components/ascii/sculptureGeometry.ts'

test('ribbon has real depth and finite unit normals for two-sided lighting', () => {
  const vertices = ribbonGeometry()
  assert.ok(vertices.length < 12000, 'bounded point count')
  const depth = vertices.map(p => p.z)
  assert.ok(Math.max(...depth) - Math.min(...depth) > 1)
  for (const p of vertices) {
    assert.ok(Object.values(p).every(Number.isFinite))
    assert.ok(Math.abs(Math.hypot(p.nx, p.ny, p.nz) - 1) < .001)
  }
})
