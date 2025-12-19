/**
 * Unit Tests for Validation Utilities
 * Run with: node tests/unit/validation.test.js
 */

import {
  validateRequired,
  validateEmail,
  validatePhone,
  validateUUID,
  validatePositiveNumber,
  validateDate,
  validateEnum,
  validateArray,
  validateName,
  validateAddress,
  validatePinCode,
  validatePassword,
  validateLineItems,
  validate
} from '../../lib/utils/validation.js'

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`\x1b[32m✓\x1b[0m ${name}`)
    passed++
  } catch (error) {
    console.log(`\x1b[31m✗\x1b[0m ${name}`)
    console.log(`  Error: ${error.message}`)
    failed++
  }
}

function assertTrue(value, msg = '') {
  if (!value) throw new Error(`${msg}Expected true, got ${value}`)
}

function assertFalse(value, msg = '') {
  if (value) throw new Error(`${msg}Expected false, got ${value}`)
}

console.log('\n=== Validation Tests ===\n')

// Required validation
console.log('--- Required Fields ---')

test('validateRequired passes with all fields', () => {
  const data = { name: 'John', email: 'john@example.com' }
  const result = validateRequired(data, ['name', 'email'])
  assertTrue(result.valid)
})

test('validateRequired fails with missing field', () => {
  const data = { name: 'John' }
  const result = validateRequired(data, ['name', 'email'])
  assertFalse(result.valid)
  assertTrue(result.message.includes('email'))
})

test('validateRequired fails with empty string', () => {
  const data = { name: 'John', email: '' }
  const result = validateRequired(data, ['name', 'email'])
  assertFalse(result.valid)
})

// Email validation
console.log('\n--- Email ---')

test('validateEmail passes valid email', () => {
  assertTrue(validateEmail('test@example.com').valid)
})

test('validateEmail passes email with subdomain', () => {
  assertTrue(validateEmail('test@mail.example.com').valid)
})

test('validateEmail fails without @', () => {
  assertFalse(validateEmail('testexample.com').valid)
})

test('validateEmail fails without domain', () => {
  assertFalse(validateEmail('test@').valid)
})

test('validateEmail fails with empty', () => {
  assertFalse(validateEmail('').valid)
})

// Phone validation
console.log('\n--- Phone ---')

test('validatePhone passes 10 digit number', () => {
  assertTrue(validatePhone('9876543210').valid)
})

test('validatePhone passes +91 format', () => {
  assertTrue(validatePhone('+919876543210').valid)
})

test('validatePhone passes 91 format', () => {
  assertTrue(validatePhone('919876543210').valid)
})

test('validatePhone passes with spaces', () => {
  assertTrue(validatePhone('98765 43210').valid)
})

test('validatePhone fails with wrong length', () => {
  assertFalse(validatePhone('12345').valid)
})

test('validatePhone passes for empty (optional)', () => {
  assertTrue(validatePhone('').valid)
})

// UUID validation
console.log('\n--- UUID ---')

test('validateUUID passes valid UUID', () => {
  assertTrue(validateUUID('123e4567-e89b-12d3-a456-426614174000').valid)
})

test('validateUUID fails invalid format', () => {
  assertFalse(validateUUID('not-a-uuid').valid)
})

test('validateUUID fails empty', () => {
  assertFalse(validateUUID('').valid)
})

// Positive number validation
console.log('\n--- Positive Number ---')

test('validatePositiveNumber passes positive', () => {
  assertTrue(validatePositiveNumber(100).valid)
})

test('validatePositiveNumber passes zero', () => {
  assertTrue(validatePositiveNumber(0).valid)
})

test('validatePositiveNumber fails negative', () => {
  assertFalse(validatePositiveNumber(-1).valid)
})

test('validatePositiveNumber fails non-number', () => {
  assertFalse(validatePositiveNumber('abc').valid)
})

// PIN code validation
console.log('\n--- PIN Code ---')

test('validatePinCode passes valid 6 digit', () => {
  assertTrue(validatePinCode('400001').valid)
})

test('validatePinCode fails 5 digit', () => {
  assertFalse(validatePinCode('40001').valid)
})

test('validatePinCode fails with letters', () => {
  assertFalse(validatePinCode('40000A').valid)
})

// Password validation
console.log('\n--- Password ---')

test('validatePassword passes 6+ chars', () => {
  assertTrue(validatePassword('password123').valid)
})

test('validatePassword fails under 6 chars', () => {
  assertFalse(validatePassword('pass').valid)
})

test('validatePassword fails empty', () => {
  assertFalse(validatePassword('').valid)
})

// Line items validation
console.log('\n--- Line Items ---')

test('validateLineItems passes valid items', () => {
  const items = [
    { description: 'Product A', quantity: 2, rate: 100 },
    { productName: 'Product B', quantity: 1, unitPrice: 200 }
  ]
  assertTrue(validateLineItems(items).valid)
})

test('validateLineItems fails empty array', () => {
  assertFalse(validateLineItems([]).valid)
})

test('validateLineItems fails missing description', () => {
  const items = [{ quantity: 2, rate: 100 }]
  assertFalse(validateLineItems(items).valid)
})

test('validateLineItems fails zero quantity', () => {
  const items = [{ description: 'Product', quantity: 0, rate: 100 }]
  assertFalse(validateLineItems(items).valid)
})

test('validateLineItems fails negative rate', () => {
  const items = [{ description: 'Product', quantity: 1, rate: -100 }]
  assertFalse(validateLineItems(items).valid)
})

// Composite validation
console.log('\n--- Composite Validation ---')

test('validate passes with valid data', () => {
  const data = {
    email: 'test@example.com',
    name: 'John',
    phone: '9876543210'
  }
  const schema = {
    email: [{ type: 'required' }, { type: 'email' }],
    name: [{ type: 'required' }],
    phone: [{ type: 'phone' }]
  }
  const result = validate(data, schema)
  assertTrue(result.valid)
})

test('validate fails with invalid data', () => {
  const data = {
    email: 'invalid-email',
    name: ''
  }
  const schema = {
    email: [{ type: 'required' }, { type: 'email' }],
    name: [{ type: 'required' }]
  }
  const result = validate(data, schema)
  assertFalse(result.valid)
  assertTrue(result.errors.length === 2)
})

// Summary
console.log('\n=== Summary ===')
console.log(`\x1b[32mPassed: ${passed}\x1b[0m`)
console.log(`\x1b[31mFailed: ${failed}\x1b[0m`)
console.log('')

process.exit(failed > 0 ? 1 : 0)
