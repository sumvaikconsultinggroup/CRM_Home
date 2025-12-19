# Build Suite - Updated Architecture (June 2025)

## Core Philosophy Change

**OLD Architecture (Deprecated):** Complex bi-directional sync between modules and central services
**NEW Architecture (Current):** Self-contained modules + Standalone products

## Product Categories

### 1. Industry Modules (SELF-CONTAINED)
These modules manage their own data independently. No sync with central services.

| Module | Collections Used | Inventory | Finance |
|--------|-----------------|-----------|---------|
| **Wooden Flooring** | `flooring_products`, `wf_inventory_stock`, `wf_inventory_movements`, `flooring_invoices`, `flooring_dispatches` | Built-in | Built-in |
| **Doors & Windows** | `dw_products`, `dw_inventory_stock`, `dw_inventory_movements`, `dw_invoices`, `dw_dispatches` | Built-in | Built-in |
| **Paints & Coatings** | `pc_products`, etc. | Built-in | Built-in |
| **Furniture** | `furniture_products`, etc. | Built-in | Built-in |

### 2. Standalone Products (Independent)
These are standalone products that can be sold separately or together with CRM.

| Product | Primary Collections | Purpose |
|---------|-------------------|---------|
| **Build CRM** | `leads`, `projects`, `tasks`, `contacts`, `customers` | Customer & Project Management |
| **Build Inventory** | `inventory_products`, `inventory_movements`, `inventory_dispatches` | General Inventory Management |
| **Build Finance** | `finance_invoices`, `finance_payments`, `finance_expenses` | Financial Management |

## Integration Rules

### What DOES Sync (CRM + Inventory + Finance Together)
When a client purchases Build CRM + Build Inventory + Build Finance as a bundle:
- **Customers** sync across all three products
- **Quotes** sync between CRM and Finance
- **Invoices** visible in Finance from CRM quotes

### What DOES NOT Sync
- **Module inventory → Build Inventory**: DISABLED
- **Module products → Central products**: DISABLED  
- **Module dispatches → Central dispatches**: DISABLED
- **Build Inventory ↔ Module Inventory**: DISABLED

## Why This Change?

### Problems with Old Architecture:
1. Complex sync logic led to data inconsistencies
2. Hard to debug when data didn't match
3. Confusing user experience (same data in multiple places)
4. Performance overhead from sync operations
5. Difficult to maintain and extend

### Benefits of New Architecture:
1. **Simplicity**: Each module is self-contained
2. **Reliability**: No sync = No sync bugs
3. **Clarity**: Clear ownership of data
4. **Performance**: No sync overhead
5. **Flexibility**: Modules can evolve independently

## Data Flow Diagrams

### Industry Module (Self-Contained)
```
┌─────────────────────────────────────────────────────────────┐
│                    WOODEN FLOORING MODULE                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐       │
│  │  Products   │   │  Inventory  │   │   Finance   │       │
│  │    Tab      │   │    Tab      │   │    Tab      │       │
│  └──────┬──────┘   └──────┬──────┘   └──────┬──────┘       │
│         │                 │                 │               │
│         ▼                 ▼                 ▼               │
│  flooring_products  wf_inventory_stock  flooring_invoices  │
│                                         flooring_payments   │
│                                                              │
│  ALL DATA STAYS WITHIN THE MODULE - NO EXTERNAL SYNC        │
└─────────────────────────────────────────────────────────────┘
```

### Standalone Products (When Sold Together)
```
┌─────────────────────────────────────────────────────────────┐
│               BUILD CRM + INVENTORY + FINANCE                │
│                   (When purchased together)                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐                      ┌─────────────┐       │
│  │  BUILD CRM  │───── Customers ─────▶│BUILD FINANCE│       │
│  │             │                      │             │       │
│  │  (contacts, │───── Quotes ────────▶│ (invoices,  │       │
│  │   leads,    │                      │  payments)  │       │
│  │   projects) │                      │             │       │
│  └─────────────┘                      └─────────────┘       │
│         │                                    ▲               │
│         │                                    │               │
│         └──────────────────────────────────-─┘               │
│                    Shared: customers                         │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              BUILD INVENTORY (Standalone)                ││
│  │   For general inventory management - NOT tied to        ││
│  │   any industry module                                    ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Implementation Notes

### Flooring Module Changes (Completed)
1. ✅ Inventory Tab integrated directly into module UI
2. ✅ Finance Tab integrated directly into module UI  
3. ✅ Stock checks use `flooring_products` and `wf_inventory_stock`
4. ✅ Dispatches use `flooring_dispatches` only
5. ✅ No sync to `inventory_products` or `finance_invoices`
6. ✅ Movements logged to `wf_inventory_movements`

### Files Modified
- `/app/app/api/flooring/enhanced/products/route.js` - Disabled sync on create/update
- `/app/app/api/flooring/enhanced/dispatch/route.js` - Uses flooring collections only
- `/app/app/api/flooring/enhanced/route.js` - Dashboard uses flooring stock
- `/app/app/api/inventory/products/route.js` - Disabled bi-directional sync

### D&W Module Changes (Completed)
1. ✅ Already had self-contained Inventory Tab using `dw_inventory`
2. ✅ Already had self-contained Finance features using `dw_invoices`, `dw_payment_collections`
3. ✅ Disabled sync to central `finance_invoices` and `finance_payments`
4. ✅ CRM sync for Projects and Contacts kept (appropriate for module-CRM integration)

## Migration Notes

### For Existing Data
Existing synced data in `inventory_products` and `inventory_product_sync` remains but is no longer updated. 
The module UI now reads/writes exclusively to module-specific collections.

### For New Installations
New products added in a module stay only in that module's collections.
No sync records are created.

---
*Updated: June 2025*
*Reason: Eliminate sync complexity and bugs*
