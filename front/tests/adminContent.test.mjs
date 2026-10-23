import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeDefaults } from '../src/lib/mergeDefaults.ts'
import { publicLink, contactEmail } from '../src/lib/siteSettings.ts'

test('new nested fields appear without overwriting edited, empty or removed lists', () => {
  const stored = { about: { brand: 'Custom', tools: [] }, contact: { headline: '' }, old: 'Kept' }
  const merged = mergeDefaults({ about: { brand: 'Default', tools: ['React'], role: 'New' }, contact: { headline: 'Hello' } }, stored)
  assert.deepEqual(merged, { about: { brand: 'Custom', tools: [], role: 'New' }, contact: { headline: '' }, old: 'Kept' })
  assert.equal(stored.about.role, undefined)
})
test('public links reject script and protocol-relative URLs while allowing hidden socials', () => {
  for (const value of ['javascript:alert(1)', '//evil.invalid', '/\\evil.invalid', 'https://example.invalid/with space']) assert.equal(publicLink(value, '/contact'), '/contact')
  assert.equal(publicLink(''), '')
  assert.equal(publicLink('/contact?type=site'), '/contact?type=site')
  assert.equal(contactEmail({ contact_email: 'new@example.invalid' }), 'new@example.invalid')
  assert.equal(contactEmail({ contact_email: 'bad\nemail' }), 'message@awwwdde.art')
})
