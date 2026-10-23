import test from 'node:test'
import assert from 'node:assert/strict'
import { LogoRotation } from '../src/lib/logoRotation.ts'

test('a whole sign keeps turning through complete revolutions', () => {
  const rotation = new LogoRotation()
  const start = rotation.angle
  for (let frame = 0; frame < 2400; frame++) rotation.advance(1 / 30, false)
  assert.ok(rotation.angle - start > Math.PI * 4)
})

test('side-on breakup and assembly have identical poses regardless of time spent scrolling', () => {
  const rotation = new LogoRotation(Math.PI / 2)
  const entry = rotation.advance(0, true)
  assert.equal(entry, Math.PI / 2)
  for (let frame = 0; frame < 3000; frame++) assert.equal(rotation.advance(1 / 30, true), entry)
  assert.equal(rotation.advance(1 / 30, false), entry)
  assert.ok(rotation.advance(1 / 30, false) > entry)
})

test('reversing the journey captures the current lower sign without unwinding', () => {
  const rotation = new LogoRotation()
  rotation.advance(0, true)
  rotation.advance(0, false)
  const lower = rotation.advance(20, false)
  assert.equal(rotation.advance(0, true), lower)
  assert.equal(rotation.advance(10, true), lower)
  assert.equal(rotation.advance(0, false), lower)
  assert.ok(rotation.advance(1, false) > lower)
})

test('a fixed preview never turns and retains its chosen breakup angle', () => {
  const rotation = new LogoRotation(1.2, 0)
  assert.equal(rotation.advance(100, false), 1.2)
  assert.equal(rotation.advance(100, true), 1.2)
  assert.equal(rotation.advance(100, false), 1.2)
})
