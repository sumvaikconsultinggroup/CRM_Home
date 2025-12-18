# Build Suite Integration Logic

## Core Philosophy
Build Suite = Build CRM + Build Inventory + Build Finance (working as ONE unified platform)
Similar to Zoho One where all products work seamlessly together.

## Architecture Mind Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BUILD SUITE                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐      ┌─────────────────┐      ┌──────────────┐    │
│  │  BUILD CRM  │  ←→  │ BUILD INVENTORY │  ←→  │BUILD FINANCE │    │
│  │  (Leads,    │      │ (Products,      │      │ (Invoices,   │    │
│  │   Contacts, │      │  Stock,         │      │  Payments,   │    │
│  │   Projects) │      │  Dispatch)      │      │  Expenses)   │    │
│  └─────────────┘      └─────────────────┘      └──────────────┘    │
│         ↑                     ↑                       ↑             │
│         │            BI-DIRECTIONAL SYNC              │             │
│         │            (Real-time, Automatic)           │             │
│         ↓                     ↓                       ↓             │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │           INDUSTRY MODULE (Wooden Flooring / D&W / etc)        ││
│  │                                                                 ││
│  │  Module Products ←──────→ Build Inventory Products              ││
│  │  Module Invoices ────────→ Build Finance Invoices               ││
│  │  Module Dispatch ═══════════ Build Inventory Dispatch           ││
│  │                    (SAME DATA - NOT COPIES)                     ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## User Scenarios

### Scenario 1: User X buys CRM + Wooden Flooring + Build Inventory
- Products added in Wooden Flooring → Appear in Build Inventory automatically
- Products added in Build Inventory → Appear in Wooden Flooring automatically
- Build Inventory shows Flooring-specific fields (wood type, thickness, finish)
- Dispatch is ONE unified system

### Scenario 2: User Y buys CRM + Doors & Windows + Build Inventory  
- Products added in D&W → Appear in Build Inventory automatically
- Build Inventory shows D&W-specific fields (material, dimensions, glass type)
- Different field schema, same seamless experience

## Data Flow Rules

### Products (BI-DIRECTIONAL SYNC)

```
┌─────────────────────┐          ┌─────────────────────┐
│  MODULE PRODUCTS    │    ←→    │ INVENTORY PRODUCTS  │
│  (flooring_products)│   SYNC   │ (inventory_products)│
└─────────────────────┘          └─────────────────────┘
        ↓                                  ↓
   - name                            - name
   - sku                             - sku  
   - pricing.sellingPrice      →     - sellingPrice
   - stockQuantity             ←     - stockQuantity
   - specs.thickness           →     - attributes.thickness
```

**Rule 1**: When product created/updated in MODULE:
- Automatically create/update in inventory_products
- Map module-specific fields to inventory attributes

**Rule 2**: When product created/updated in BUILD INVENTORY:
- If locked to a module → create/update in module's product collection
- Stock changes in inventory → reflect in module immediately

### Dispatch (UNIFIED - NOT COPIES)

```
┌─────────────────────┐
│  DISPATCH RECORDS   │  ← ONE collection used by BOTH
│  (flooring_dispatches)│    Module UI and Build Inventory UI
└─────────────────────┘
           │
           ├── Stock Check → inventory_products.stockQuantity
           ├── Stock Deduct → inventory_products.stockQuantity -= dispatched
           └── Movement Log → inventory_movements
```

**Rule**: Module's Dispatch Section and Build Inventory's Dispatch Section 
read from the SAME collection. No data duplication.

### Invoices/Finance (ONE-WAY SYNC + REFERENCES)

```
Module Invoice Created
        │
        ├──→ flooring_invoices (module-specific)
        │
        └──→ finance_invoices (Build Finance - for accounting)
              with reference back to source
```

## DO's and DON'Ts

### ✅ DO's

1. **Single Source of Truth**
   - Stock quantity lives in `inventory_products.stockQuantity`
   - Module reads from there, never maintains separate stock

2. **Bi-directional Sync**
   - Module ↔ Build Inventory (both ways)
   - Changes in one place = changes everywhere

3. **Unified Dispatch**
   - One dispatch system, accessible from both Module and Build Inventory
   - Same data, different UI views

4. **Module-Adaptive UI**
   - Build Inventory shows fields relevant to connected module
   - Flooring connected? Show wood type, finish, etc.
   - D&W connected? Show material, dimensions, etc.

5. **Real-time Sync**
   - No manual "Sync Now" for basic operations
   - Automatic on every save

### ❌ DON'Ts

1. **DON'T create separate stock counts**
   - Module stock ≠ Inventory stock = WRONG
   - Should always be: Module reads FROM Inventory

2. **DON'T duplicate dispatch records**
   - Module dispatch table + Inventory dispatch table = WRONG
   - Should be: One dispatch collection, two views

3. **DON'T require manual sync for new products**
   - User adds product → must appear everywhere immediately

4. **DON'T use different IDs for same product**
   - Module product ID should map to Inventory product ID
   - Use sourceProductId for tracking

5. **DON'T store module-specific data in generic fields**
   - Use `attributes` object for module-specific properties

## Implementation Checklist

- [ ] Products: Bi-directional sync on save (not just manual sync button)
- [ ] Products: Module→Inventory sync includes stockQuantity
- [ ] Products: Inventory→Module sync when product added in Build Inventory
- [ ] Dispatch: Same collection accessed by both UIs
- [ ] Dispatch: Stock check uses inventory_products
- [ ] Dispatch: Stock deduct updates inventory_products
- [ ] Stock: Module UI shows stock from inventory_products
- [ ] Fields: Build Inventory shows module-specific fields

## Collections Reference

| Collection | Purpose | Used By |
|------------|---------|---------|
| `inventory_products` | Central product catalog with stock | Build Inventory, Modules |
| `flooring_products` | Module-specific product data | Wooden Flooring Module |
| `flooring_dispatches` | Dispatch records | Module + Build Inventory |
| `inventory_movements` | Stock movement log | Build Inventory |
| `flooring_invoices` | Module invoices | Wooden Flooring Module |
| `finance_invoices` | Finance-level invoices | Build Finance |
