# QA/Stabilization Summary - BuildCRM Platform

## Overview

This document summarizes the comprehensive QA and reliability infrastructure implemented for the BuildCRM platform.

---

## A) System Invariants Defined ✅

**File:** `/app/SYSTEM_INVARIANTS.md`

Defined correctness rules for:
1. **Tenant Isolation** - Every record belongs to exactly one clientId
2. **Single Source of Truth** - Projects and Tasks exist only in core collections
3. **State Machine Correctness** - Valid stage transitions defined
4. **Sync Correctness** - Event-driven updates with drift detection
5. **Financial Correctness** - Quote/Invoice totals validation, tax calculations
6. **Integration Correctness** - Idempotent processing with retry/dead-letter

---

## B) Observability Infrastructure ✅

### Audit Logger
**File:** `/app/lib/observability/audit-logger.js`

- Central audit logging for all CRUD operations
- Stage transitions and status changes
- Payment recording and financial events
- Integration calls and webhooks
- Admin access logging

**API Endpoint:** `GET/POST /api/audit-logs`

### Request Context
**File:** `/app/lib/observability/request-context.js`

- Correlation ID generation (`x-request-id`)
- Request context with tenant_id, user_id
- Structured logging with context
- Error categorization (validation, business_logic, integration, etc.)

---

## C) Automated Test Suite ✅

### Unit Tests
**Files:**
- `/app/tests/unit/state-machines.test.js` (25 tests)
- `/app/tests/unit/validation.test.js` (35 tests)

**Run:**
```bash
cd /app && node --experimental-vm-modules tests/unit/state-machines.test.js
cd /app && node --experimental-vm-modules tests/unit/validation.test.js
```

### Test Coverage:
- ✅ Lead state transitions
- ✅ Project state transitions
- ✅ Invoice state transitions
- ✅ Email validation
- ✅ Phone validation (Indian format)
- ✅ UUID validation
- ✅ Line items validation
- ✅ Composite validation schemas

---

## D) State Machine Implementation ✅

**File:** `/app/lib/config/state-machines.js`

State machines defined for:
- **Leads:** new → contacted → qualified → proposal → negotiation → won/lost
- **Projects:** planning → in_progress → on_hold → review → completed → archived
- **Tasks:** backlog → todo → in_progress → review → completed
- **Invoices:** draft → sent → partial → paid / overdue
- **Quotes:** draft → sent → approved → rejected → converted
- **Dispatch:** pending → dispatched → in_transit → delivered
- **Installation:** scheduled → in_progress → completed

**Features:**
- `isValidTransition()` - Check if transition is allowed
- `getAllowedTransitions()` - Get valid next states
- `createStateMachine()` - Factory for custom state machines
- Pre-built validators for each entity type

---

## E) Consistency Scanner (Data Integrity) ✅

**File:** `/app/lib/integrity/consistency-scanner.js`

### Checks Implemented:
1. **Orphan Records** - Module records with missing project references
2. **Missing References** - Invoices/Quotes with invalid customer IDs
3. **Financial Totals** - Line item sums vs stored totals, payment reconciliation
4. **Negative Inventory** - Stock levels below zero
5. **Duplicate Leads** - Same email/phone across multiple records
6. **Invalid States** - Status values not in valid state list
7. **Missing Required Fields** - ID, name, invoiceNumber, etc.

### API Endpoint
`POST /api/admin/integrity`

```bash
# Run scan
curl -X POST "$BASE_URL/api/admin/integrity" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"scan"}'

# Auto-fix safe issues
curl -X POST "$BASE_URL/api/admin/integrity" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"autofix", "issueIds":["uuid1","uuid2"]}'
```

### Auto-Fix Capabilities:
- Remove orphan projectId references from tasks
- Recalculate invoice subtotals
- Reset invalid states to defaults

---

## F) Idempotent Event Processing ✅

**File:** `/app/lib/events/event-processor.js`

### Features:
- Event queue with status tracking (pending, processed, failed)
- Dedupe key generation to prevent duplicates
- `isEventProcessed()` check before processing
- Retry with max 3 attempts
- Dead letter queue for failed events
- Event handler registry pattern

### Event Types:
- Lead events (created, updated, converted)
- Project events (created, stage_changed)
- Quote events (created, approved, rejected)
- Invoice events (created, sent, paid)
- Payment events (recorded)
- Inventory events (reserved, deducted, returned)
- Integration events (whatsapp, lead_import, accounting)

---

## G) Reset & Seed Functionality ✅

**File:** `/app/lib/db/reset-and-seed.js`

### Commands:

**Reset Single Client:**
```bash
curl -X POST "$BASE_URL/api/admin/reset-seed" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"reset_client", "confirmReset":"CONFIRM_RESET"}'
```

**Create Sample Tenants (Super Admin):**
```bash
curl -X POST "$BASE_URL/api/admin/reset-seed" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -d '{"action":"seed_tenants", "confirmReset":"CONFIRM_SEED"}'
```

### Sample Data Created:
- **Tenant A:** FloorMasters India (Wooden Flooring)
  - 10 Leads, 3 Projects, 18 Tasks
  - 3 Flooring Products with inventory
  - Quotes and Invoices (1 completed, 1 partial)
  - WhatsApp templates and mocked messages

- **Tenant B:** WindowWorld (Doors & Windows)
  - 10 Leads, 3 Projects, 18 Tasks
  - WhatsApp templates

**Credentials:** See `/app/SEED_REPORT.md`

---

## H) Input Validation Library ✅

**File:** `/app/lib/utils/validation.js`

### Validators:
- `validateRequired()` - Check required fields
- `validateEmail()` - Email format
- `validatePhone()` - Indian phone numbers
- `validateUUID()` - UUID format
- `validatePositiveNumber()` - Non-negative numbers
- `validateDate()` - Date format
- `validateEnum()` - Value in allowed list
- `validateArray()` - Array with min length
- `validateName()` - Name validation
- `validateAddress()` - Address validation
- `validatePinCode()` - Indian PIN codes
- `validatePassword()` - Password strength
- `validateLineItems()` - Invoice line items
- `validateTaskData()` - Task object validation
- `validateUserData()` - User object validation
- `validateLeadData()` - Lead object validation
- `validateExpenseData()` - Expense object validation

### Sanitizers:
- `sanitizeString()` - Trim strings
- `sanitizeHTML()` - Basic XSS prevention

### Composite Validation:
```javascript
const result = validate(data, {
  email: [{ type: 'required' }, { type: 'email' }],
  name: [{ type: 'required' }],
  phone: [{ type: 'phone' }]
})
```

---

## Files Created/Modified

### New Files:
| File | Purpose |
|------|---------|
| `/app/SYSTEM_INVARIANTS.md` | System rules documentation |
| `/app/SEED_REPORT.md` | Test data documentation |
| `/app/lib/config/state-machines.js` | State transition rules |
| `/app/lib/observability/audit-logger.js` | Audit logging |
| `/app/lib/observability/request-context.js` | Request correlation |
| `/app/lib/integrity/consistency-scanner.js` | Data integrity checks |
| `/app/lib/events/event-processor.js` | Idempotent events |
| `/app/lib/db/reset-and-seed.js` | Reset and seed logic |
| `/app/lib/utils/validation.js` | Input validation (extended) |
| `/app/app/api/admin/integrity/route.js` | Integrity API |
| `/app/app/api/admin/reset-seed/route.js` | Reset/Seed API |
| `/app/app/api/audit-logs/route.js` | Audit logs API |
| `/app/tests/unit/state-machines.test.js` | State machine tests |
| `/app/tests/unit/validation.test.js` | Validation tests |
| `/app/tests/run-tests.sh` | Test runner script |

### Modified Files:
| File | Changes |
|------|---------|
| `/app/app/flooring/page.js` | Fixed import to use correct module |

---

## Running Tests

```bash
# All unit tests
cd /app
node --experimental-vm-modules tests/unit/state-machines.test.js
node --experimental-vm-modules tests/unit/validation.test.js

# Using test runner
chmod +x tests/run-tests.sh
./tests/run-tests.sh unit
```

---

## Data Integrity Scan Results

Current scan found **3 issues**:
1. ⚠️ **Critical:** Orphan invoice (references missing project)
2. ⚠️ **Critical:** Negative inventory stock (-200 units)
3. ⚠️ **High:** Invalid lead status ("payment_complete")

These are real data issues in the existing database that need manual review.

---

## What's Still Needed

### Integration Tests (Not Yet Implemented):
- Quote → Invoice conversion flow
- Module tab data in projects
- WhatsApp trigger events (mock)
- Lead ingestion pipeline (mock)

### E2E Tests (Not Yet Implemented):
- Playwright tests for full workflows
- Login via SSO (mock)
- Lead → Project → Module flow

### Additional Work:
- [ ] Build Finance sync verification
- [ ] Build Inventory sync verification
- [ ] Cross-tenant isolation tests
- [ ] Performance/load testing

---

## Quick Reference

### Run Integrity Scan:
```bash
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" -d '{"email":"xyz@interiors.com","password":"client123"}' | jq -r '.token')

curl -X POST "$BASE_URL/api/admin/integrity" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"action":"scan"}'
```

### Run Unit Tests:
```bash
cd /app && node --experimental-vm-modules tests/unit/state-machines.test.js
```

### View Audit Logs:
```bash
curl "$BASE_URL/api/audit-logs?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```
