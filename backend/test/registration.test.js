import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isValidBirthDate } from '../src/data/registration.js'

test('valida fechas de nacimiento ISO válidas y no futuras', () => {
  const now = new Date(2026, 10, 8, 12)
  assert.equal(isValidBirthDate('2000-02-29', now), true)
  assert.equal(isValidBirthDate('2026-02-29', now), false)
  assert.equal(isValidBirthDate('2026-11-09', now), false)
  assert.equal(isValidBirthDate('', now), false)
  assert.equal(isValidBirthDate('08/11/1995', now), false)
})
