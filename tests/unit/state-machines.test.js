/**
 * Unit Tests for State Machine Logic
 * Run with: node tests/unit/state-machines.test.js
 */

import {
  LEAD_STAGES,
  LEAD_TRANSITIONS,
  PROJECT_STAGES,
  PROJECT_TRANSITIONS,
  INVOICE_STAGES,
  INVOICE_TRANSITIONS,
  leadStateMachine,
  projectStateMachine,
  invoiceStateMachine,
  isValidTransition,
  getAllowedTransitions
} from '../../lib/config/state-machines.js'

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

function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg}Expected ${expected}, got ${actual}`)
  }
}

function assertTrue(value, msg = '') {
  if (!value) {
    throw new Error(`${msg}Expected true, got ${value}`)
  }
}

function assertFalse(value, msg = '') {
  if (value) {
    throw new Error(`${msg}Expected false, got ${value}`)
  }
}

console.log('\n=== State Machine Tests ===\n')

// Lead State Machine Tests
console.log('--- Lead State Machine ---')

test('Lead: new -> contacted is valid', () => {
  assertTrue(isValidTransition(LEAD_TRANSITIONS, 'new', 'contacted'))
})

test('Lead: new -> won is invalid (skip stages)', () => {
  assertFalse(isValidTransition(LEAD_TRANSITIONS, 'new', 'won'))
})

test('Lead: new -> qualified is invalid (skip stages)', () => {
  assertFalse(isValidTransition(LEAD_TRANSITIONS, 'new', 'qualified'))
})

test('Lead: negotiation -> won is valid', () => {
  assertTrue(isValidTransition(LEAD_TRANSITIONS, 'negotiation', 'won'))
})

test('Lead: won -> anything is invalid (terminal state)', () => {
  assertFalse(isValidTransition(LEAD_TRANSITIONS, 'won', 'new'))
  assertFalse(isValidTransition(LEAD_TRANSITIONS, 'won', 'contacted'))
})

test('Lead: lost -> new is valid (re-open)', () => {
  assertTrue(isValidTransition(LEAD_TRANSITIONS, 'lost', 'new'))
})

test('Lead: any stage -> lost is valid', () => {
  assertTrue(isValidTransition(LEAD_TRANSITIONS, 'new', 'lost'))
  assertTrue(isValidTransition(LEAD_TRANSITIONS, 'contacted', 'lost'))
  assertTrue(isValidTransition(LEAD_TRANSITIONS, 'qualified', 'lost'))
  assertTrue(isValidTransition(LEAD_TRANSITIONS, 'proposal', 'lost'))
  assertTrue(isValidTransition(LEAD_TRANSITIONS, 'negotiation', 'lost'))
})

test('Lead State Machine validate() returns correct errors', () => {
  const result = leadStateMachine.validate('new', 'won')
  assertFalse(result.valid)
  assertTrue(result.error.includes('Invalid transition'))
})

// Project State Machine Tests
console.log('\n--- Project State Machine ---')

test('Project: planning -> in_progress is valid', () => {
  assertTrue(isValidTransition(PROJECT_TRANSITIONS, 'planning', 'in_progress'))
})

test('Project: planning -> completed is invalid (skip stages)', () => {
  assertFalse(isValidTransition(PROJECT_TRANSITIONS, 'planning', 'completed'))
})

test('Project: in_progress -> review is valid', () => {
  assertTrue(isValidTransition(PROJECT_TRANSITIONS, 'in_progress', 'review'))
})

test('Project: review -> completed is valid', () => {
  assertTrue(isValidTransition(PROJECT_TRANSITIONS, 'review', 'completed'))
})

test('Project: completed -> archived is valid', () => {
  assertTrue(isValidTransition(PROJECT_TRANSITIONS, 'completed', 'archived'))
})

test('Project: cancelled -> planning is valid (re-open)', () => {
  assertTrue(isValidTransition(PROJECT_TRANSITIONS, 'cancelled', 'planning'))
})

// Invoice State Machine Tests
console.log('\n--- Invoice State Machine ---')

test('Invoice: draft -> sent is valid', () => {
  assertTrue(isValidTransition(INVOICE_TRANSITIONS, 'draft', 'sent'))
})

test('Invoice: draft -> paid is invalid (must be sent first)', () => {
  assertFalse(isValidTransition(INVOICE_TRANSITIONS, 'draft', 'paid'))
})

test('Invoice: sent -> partial is valid', () => {
  assertTrue(isValidTransition(INVOICE_TRANSITIONS, 'sent', 'partial'))
})

test('Invoice: sent -> paid is valid', () => {
  assertTrue(isValidTransition(INVOICE_TRANSITIONS, 'sent', 'paid'))
})

test('Invoice: partial -> paid is valid', () => {
  assertTrue(isValidTransition(INVOICE_TRANSITIONS, 'partial', 'paid'))
})

test('Invoice: paid -> anything is invalid (terminal state)', () => {
  assertFalse(isValidTransition(INVOICE_TRANSITIONS, 'paid', 'partial'))
  assertFalse(isValidTransition(INVOICE_TRANSITIONS, 'paid', 'draft'))
})

test('Invoice: overdue -> paid is valid', () => {
  assertTrue(isValidTransition(INVOICE_TRANSITIONS, 'overdue', 'paid'))
})

// Helper function tests
console.log('\n--- Helper Functions ---')

test('getAllowedTransitions returns correct stages for lead new', () => {
  const allowed = getAllowedTransitions(LEAD_TRANSITIONS, 'new')
  assertTrue(allowed.includes('contacted'))
  assertTrue(allowed.includes('lost'))
  assertFalse(allowed.includes('won'))
})

test('getAllowedTransitions returns empty for terminal state', () => {
  const allowed = getAllowedTransitions(LEAD_TRANSITIONS, 'won')
  assertEqual(allowed.length, 0)
})

test('isValidTransition handles invalid from stage', () => {
  assertFalse(isValidTransition(LEAD_TRANSITIONS, 'invalid_stage', 'contacted'))
})

test('State machine isValid checks stage validity', () => {
  assertTrue(leadStateMachine.isValid('new'))
  assertTrue(leadStateMachine.isValid('won'))
  assertFalse(leadStateMachine.isValid('invalid'))
})

// Summary
console.log('\n=== Summary ===')
console.log(`\x1b[32mPassed: ${passed}\x1b[0m`)
console.log(`\x1b[31mFailed: ${failed}\x1b[0m`)
console.log('')

process.exit(failed > 0 ? 1 : 0)
