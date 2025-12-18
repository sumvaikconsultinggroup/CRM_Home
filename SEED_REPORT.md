# Seed Report - BuildCRM Test Data

This document describes the test data created by the Reset & Seed functionality.

## Sample Tenants

### Tenant A: FloorMasters India (Wooden Flooring)

**Purpose:** Wooden Flooring specialist with full workflow demonstration data

**Credentials:**
- Email: `admin@floormasters.com`
- Password: `floor123`

**Data Included:**
- 10 Leads from mixed sources (Meta, Google, IndiaMART, JustDial, Website, Referral)
- 3 Projects:
  - **Sharma Residence** (Completed) - Full workflow done
  - **Patel Villa** (In Progress) - Mid-stage with partial payment
  - **ABC Builders** (Planning) - New B2B project needing attention
- 18 Tasks (6 per project) covering site visits, measurements, quotations, follow-ups
- 3 Expenses (Office supplies, travel, materials)
- 3 Flooring Products with inventory stock:
  - Premium Oak Engineered Wood (5000 sqft @ ₹450/sqft)
  - American Walnut Solid Wood (3000 sqft @ ₹680/sqft)
  - Budget Laminate Flooring (10000 sqft @ ₹180/sqft)
- 2 Quotes and 2 Invoices
- 3 WhatsApp automation templates
- 2 Sample triggered messages (mocked)

### Tenant B: WindowWorld (Doors & Windows)

**Purpose:** Doors & Windows fabricator with sample projects

**Credentials:**
- Email: `admin@windowworld.com`
- Password: `window123`

**Data Included:**
- 10 Leads from mixed sources
- 3 Projects at different stages
- 18 Tasks
- 3 Expenses
- 3 WhatsApp automation templates

---

## Verification Steps

### 1. Login Test
1. Go to app URL
2. Click "Sign In"
3. Enter `admin@floormasters.com` / `floor123`
4. Should see dashboard with stats

### 2. Dashboard Verification
- Total Leads: 10
- Total Projects: 3
- Revenue/Invoices displayed
- Task summary visible

### 3. Leads Flow
1. Click "Leads" in sidebar
2. Verify 10 leads from different sources
3. Open a lead, verify details
4. Change lead status (new → contacted)

### 4. Projects Flow
1. Click "Projects" in sidebar
2. Verify 3 projects at different stages
3. Click on "Sharma Residence" - should show completed status
4. Click on "Patel Villa" - should show in_progress with tasks

### 5. Wooden Flooring Module
1. Click "Wooden Flooring" in sidebar
2. **Dashboard tab:** Verify stats display
3. **Products tab:** Should show 3 products
4. **Inventory tab:** Should show stock levels
5. **Quotes tab:** Should show 2 quotes
6. **Invoices tab:** Should show 2 invoices (1 paid, 1 partial)

### 6. Tasks Flow
1. Click "Tasks" in sidebar
2. Verify Kanban board with tasks
3. Drag a task from "To Do" to "In Progress"
4. Create new task with Simple/Advanced toggle

### 7. Expenses Flow
1. Click "Expenses" in sidebar
2. Verify 3 expense entries
3. Filter by category

### 8. WhatsApp Automation
1. Go to Flooring Module → Settings → WhatsApp Integration
2. Verify 3 templates visible
3. Check WhatsApp logs (mocked delivery status)

---

## Data Integrity Check

After seeding, run the integrity scan:

```bash
# Via API
curl -X POST "$BASE_URL/api/admin/integrity" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "scan"}'
```

**Expected Result:** 0 critical issues on clean seed data

---

## Reset Commands

### Reset Single Tenant
```bash
curl -X POST "$BASE_URL/api/admin/reset-seed" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "reset_client", "confirmReset": "CONFIRM_RESET"}'
```

### Create Fresh Sample Tenants (Super Admin Only)
```bash
curl -X POST "$BASE_URL/api/admin/reset-seed" \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "seed_tenants", "confirmReset": "CONFIRM_SEED"}'
```

---

## Known Limitations

1. **WhatsApp Messages:** Mocked provider - no actual messages sent
2. **Build Finance Sync:** Not auto-synced, manual trigger required
3. **Build Inventory:** Synced via module, not Build Inventory standalone
4. **File Attachments:** No sample files attached to records
5. **Google SSO:** Not testable without real Google OAuth setup

---

## Test Scenarios by Flow

### Complete Sale Flow (B2C)
1. Lead created (new status)
2. Lead contacted → qualified → proposal
3. Convert lead to project
4. Site survey / measurement
5. Create quote → send to customer
6. Quote approved
7. Generate invoice from quote
8. Record payment (partial/full)
9. Dispatch goods
10. Schedule installation
11. Complete installation
12. Project marked complete

### Stuck Project (Needs Attention)
- ABC Builders project in "planning" stage
- No quote created yet
- Tasks pending: Site visit, measurement
- Follow-up task overdue

### Partial Payment Scenario
- Patel Villa project
- Invoice: ₹6,41,920 total
- Paid: ₹3,00,000
- Balance: ₹3,41,920
- Status: partial

---

## Running Full Test Suite

```bash
# Unit tests
cd /app && chmod +x tests/run-tests.sh && ./tests/run-tests.sh unit

# All tests
./tests/run-tests.sh all
```

---

## Files Reference

| File | Purpose |
|------|--------|
| `/lib/db/reset-and-seed.js` | Reset and seed logic |
| `/lib/integrity/consistency-scanner.js` | Data integrity checks |
| `/lib/config/state-machines.js` | State transition rules |
| `/lib/observability/audit-logger.js` | Audit logging |
| `/lib/events/event-processor.js` | Idempotent event processing |
| `/app/api/admin/integrity/route.js` | Integrity scan API |
| `/app/api/admin/reset-seed/route.js` | Reset/Seed API |
| `/app/api/audit-logs/route.js` | Audit logs query API |
| `/SYSTEM_INVARIANTS.md` | System rules documentation |
