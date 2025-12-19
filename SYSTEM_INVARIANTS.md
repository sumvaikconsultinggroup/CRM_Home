# System Invariants - BuildCRM Platform

This document defines the correctness rules (invariants) that MUST be enforced across the entire codebase. All developers, code reviews, and automated tests must validate these rules.

## 1. Tenant Isolation (CRITICAL)

### Rules:
1. **Every record must belong to exactly one tenant (clientId)**
   - All client-specific data lives in client-specific databases (format: `CL-XXXXXX`)
   - No mixing of tenant data in shared collections
   - Platform data (users, clients, modules, plans) lives in main `buildcrm` database

2. **No API should ever read/write data without clientId guard**
   - All API routes must extract `clientId` from JWT token
   - Database operations must use `getClientDb(clientId)` for client data
   - Never use hardcoded database names in business logic

3. **Token-based isolation**
   - JWT token contains: `{ id, email, role, clientId, databaseName }`
   - Every request must validate token and extract tenant context
   - No cross-tenant queries allowed

4. **Admin access logging**
   - Super admin access to client data must be logged to `admin_audit_logs`
   - Support access requires explicit client consent (logged)
   - All admin actions must include `requesterId`, `targetClientId`, `action`, `timestamp`

### Enforcement:
- Middleware: `extractClientFromToken()` must run on all `/api/*` routes
- Tests: `tenant-isolation.test.js` validates no cross-tenant leakage
- Audit: Weekly scan for any direct MongoDB queries without tenant filter

---

## 2. Single Source of Truth for Core Objects

### Rules:
1. **Projects exist only once in core**
   - Collection: `{clientDb}.projects`
   - All module entities reference via `projectId`
   - Never duplicate project data in module tables

2. **Tasks exist only once in core**
   - Collection: `{clientDb}.tasks`
   - Module-specific tasks use `entity_type` and `entity_id` references
   - Example: `{ entity_type: 'flooring_quote', entity_id: 'FLQ-001' }`

3. **Contacts/Customers**
   - Primary: `{clientDb}.contacts`
   - Module customers must link via `contactId`
   - Module-specific data in `module_customers` with reference

### Canonical Collections:
| Entity | Collection | Owned By |
|--------|------------|----------|
| Projects | `projects` | Core |
| Tasks | `tasks` | Core |
| Leads | `leads` | Core |
| Contacts | `contacts` | Core |
| Expenses | `expenses` | Core |
| Module Quotes | `flooring_quotes`, `dw_quotes` | Module |
| Module Invoices | `flooring_invoices`, `dw_invoices` | Module |
| Inventory | `wf_inventory_stock` | Build Inventory |

---

## 3. State Machine Correctness

### Rules:
1. **Every entity with stages must use config-defined pipelines**
   - Lead stages: `new` → `contacted` → `qualified` → `proposal` → `negotiation` → `won/lost`
   - Project stages: `planning` → `in_progress` → `review` → `completed` → `archived`
   - Invoice stages: `draft` → `sent` → `partial` → `paid` → `overdue`

2. **Transition validation**
   - No illegal stage jumps (e.g., `new` → `won` directly)
   - Transitions must be defined in `/lib/config/state-machines.js`
   - Each transition must validate preconditions

3. **Audit trail**
   - Every transition creates an entry in `activity_logs`
   - Format: `{ entityType, entityId, fromStage, toStage, triggeredBy, timestamp }`

### State Machines:
```javascript
// Lead Pipeline
LEAD_STAGES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
ALLOWED_TRANSITIONS = {
  'new': ['contacted', 'lost'],
  'contacted': ['qualified', 'lost'],
  'qualified': ['proposal', 'lost'],
  'proposal': ['negotiation', 'lost'],
  'negotiation': ['won', 'lost'],
  'won': [],
  'lost': ['new'] // Can re-open
}
```

---

## 4. Sync Correctness

### Rules:
1. **No duplicate storage** - If data must be duplicated, define canonical source
2. **Event-driven updates** - Use events for sync, not polling
3. **Idempotent handlers** - Same event processed twice = same result
4. **Drift detection** - Weekly reconciliation job for mismatch detection

### Sync Pairs:
| Source | Target | Strategy |
|--------|--------|----------|
| `flooring_invoices` | `Build Finance` | Event: invoice.created, invoice.paid |
| `flooring_quotes` | `inventory_reservations` | Event: quote.created, quote.approved |
| `inventory_movements` | `wf_inventory_stock` | Immediate update on movement |
| CRM Projects | Module Projects | Reference only (no duplication) |

---

## 5. Financial Correctness (CRITICAL)

### Rules:
1. **Quote → Invoice totals must match**
   - `invoice.subtotal` = sum of line items
   - `invoice.taxAmount` = `subtotal * taxRate`
   - `invoice.grandTotal` = `subtotal + taxAmount - discounts`

2. **Tax calculation by region**
   - India: GST (CGST + SGST or IGST)
   - Tax rates from `module_settings.defaultTaxRate`

3. **Payment reconciliation**
   - `sum(payments)` must equal `invoice.paidAmount`
   - `invoice.balance` = `grandTotal - paidAmount`
   - Status: `paid` when `balance <= 0`

4. **Inventory valuation**
   - Stock value = sum(quantity * unitCost)
   - Never negative physical stock (logical only for backorders)

### Financial Audit Checks:
- [ ] All invoices have valid line items
- [ ] Tax calculations match expected rates
- [ ] Payment totals reconcile with invoice amounts
- [ ] No orphan payments (payment without invoice)

---

## 6. Integration Correctness

### Rules:
1. **Idempotency** - Every integration call must be idempotent
   - Use `dedupe_key` for leads (email + source + timestamp_day)
   - Use `message_id` for WhatsApp messages
   - Use `invoice_id` for accounting syncs

2. **Retry with backoff**
   - Max 3 retries with exponential backoff
   - Dead letter queue after max retries
   - Status tracking: `pending` → `processing` → `success/failed`

3. **Duplicate prevention**
   - Store processed event IDs in `processed_events`
   - Check before processing: `if (await isProcessed(eventId)) return`

### Integration Logs:
```javascript
{
  id: 'uuid',
  type: 'whatsapp_send' | 'lead_import' | 'accounting_sync',
  clientId: 'CL-XXXXXX',
  payload: { ... },
  response: { ... },
  status: 'success' | 'failed' | 'retrying',
  retryCount: 0,
  dedupeKey: 'unique-key',
  createdAt: Date,
  processedAt: Date
}
```

---

## 7. Observability Requirements

### Mandatory Logging:
1. **Audit logs** for every:
   - Create/Update/Delete operation
   - Stage transition
   - Payment recording
   - Integration call

2. **Request correlation**
   - Every request gets `x-request-id`
   - All logs include: `requestId`, `clientId`, `userId`, `action`

3. **Error tracking**
   - Structured error logs with stack traces
   - Error categorization: `validation`, `business_logic`, `integration`, `system`

---

## 8. Data Integrity Constraints

### Required Fields:
| Collection | Required Fields |
|------------|----------------|
| projects | id, name, clientId, status, createdAt |
| tasks | id, title, status, createdAt |
| leads | id, email OR phone, source, status |
| invoices | id, invoiceNumber, customerId, items, total |
| payments | id, invoiceId, amount, method, date |

### Referential Integrity:
- All `projectId` references must point to existing project
- All `customerId` references must point to existing contact/customer
- All `invoiceId` in payments must point to existing invoice

---

## Enforcement Mechanisms

1. **Pre-commit hooks**: Run linting and basic validation
2. **CI/CD pipeline**: Run full test suite
3. **Consistency Scanner**: Weekly automated scan
4. **Code Review Checklist**: Must verify invariants

## Violation Response

1. **Critical (Tenant Isolation, Financial)**: Immediate fix required, block deployment
2. **High (State Machine, Sync)**: Fix within 24 hours
3. **Medium (Observability)**: Fix within sprint
4. **Low (Conventions)**: Fix when touching related code
