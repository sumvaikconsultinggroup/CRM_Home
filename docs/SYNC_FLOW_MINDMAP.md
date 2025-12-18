# Build Suite - Sync Flow Mind Map

## The Problem
Products and data should be IDENTICAL in both:
- **Flooring Module** (flooring_products)
- **Build Inventory** (inventory_products)

## Current Issues Found
1. Count mismatch (3 in Module vs 4 in Inventory)
2. Price mismatch for "Installation Labor"
3. Manual entry not syncing back to module

---

## CORRECT FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PRODUCT SYNC FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────────┐
                    │   User adds product in   │
                    │   FLOORING MODULE        │
                    └───────────┬──────────────┘
                                │
                                ▼
              ┌─────────────────────────────────────┐
              │  1. Save to flooring_products       │
              │  2. AUTO-CREATE in inventory_products│
              │     - Copy ALL fields               │
              │     - Set sourceProductId = flooring ID
              │     - Set sourceModuleId = 'wooden-flooring'
              └─────────────────────────────────────┘
                                │
                                ▼
                    ┌──────────────────────────┐
                    │   BOTH COLLECTIONS NOW   │
                    │   HAVE SAME PRODUCT      │
                    └──────────────────────────┘


                    ┌──────────────────────────┐
                    │   User adds product in   │
                    │   BUILD INVENTORY        │
                    │   (locks to module)      │
                    └───────────┬──────────────┘
                                │
                                ▼
              ┌─────────────────────────────────────┐
              │  1. Save to inventory_products      │
              │  2. AUTO-CREATE in flooring_products│
              │     - Copy relevant fields          │
              │     - Set sourceInventoryId = inv ID│
              └─────────────────────────────────────┘


                    ┌──────────────────────────┐
                    │   User UPDATES product   │
                    │   in EITHER location     │
                    └───────────┬──────────────┘
                                │
                                ▼
              ┌─────────────────────────────────────┐
              │  IMMEDIATELY sync to other location │
              │  - Stock quantity                   │
              │  - Price (selling, cost, MRP)       │
              │  - Name, SKU, Description           │
              │  - Status (active/inactive)         │
              └─────────────────────────────────────┘

```

---

## DISPATCH FLOW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DISPATCH FLOW                                       │
└─────────────────────────────────────────────────────────────────────────────┘

   ┌─────────────────┐
   │ Invoice Created │
   │ in Module       │
   └────────┬────────┘
            │
            ▼
   ┌─────────────────────────────────────────┐
   │ Invoice contains items with productId   │
   │ (from flooring_products)                │
   └────────┬────────────────────────────────┘
            │
            ▼
   ┌─────────────────────────────────────────┐
   │ User initiates DISPATCH                 │
   │ from Module OR Build Inventory          │
   └────────┬────────────────────────────────┘
            │
            ▼
   ┌─────────────────────────────────────────┐
   │ STEP 1: STOCK CHECK                     │
   │ - Look up productId in inventory_products│
   │ - Use sourceProductId to find match     │
   │ - Check stockQuantity >= dispatch qty   │
   └────────┬────────────────────────────────┘
            │
            ▼
   ┌─────────────────────────────────────────┐
   │ STEP 2: DEDUCT STOCK                    │
   │ - Update inventory_products.stockQuantity│
   │ - This AUTOMATICALLY updates            │
   │   flooring_products.stockQuantity       │
   │   (via bi-directional sync)             │
   └────────┬────────────────────────────────┘
            │
            ▼
   ┌─────────────────────────────────────────┐
   │ STEP 3: CREATE DISPATCH RECORD          │
   │ - Store in flooring_dispatches          │
   │ - Accessible from BOTH:                 │
   │   * Module's Dispatch tab               │
   │   * Build Inventory's Dispatch view     │
   └────────┬────────────────────────────────┘
            │
            ▼
   ┌─────────────────────────────────────────┐
   │ STEP 4: LOG MOVEMENT                    │
   │ - Create inventory_movements record     │
   │ - For audit trail                       │
   └─────────────────────────────────────────┘

```

---

## DO's (MUST FOLLOW)

1. **NEVER have different stock in Module vs Inventory**
   - Single source of truth: inventory_products.stockQuantity
   - Module reads FROM this, doesn't maintain separate

2. **ALWAYS sync on save**
   - No manual "Sync Now" needed
   - Every POST/PUT triggers sync

3. **USE sourceProductId for matching**
   - inventory_products.sourceProductId = flooring_products.id
   - This is the KEY for finding pairs

4. **SYNC ALL FIELDS**
   - name, sku, description
   - pricing (cost, selling, MRP)
   - stockQuantity
   - status/active

## DON'Ts (NEVER DO)

1. **DON'T create orphan products**
   - If in Module, must be in Inventory
   - If locked to Module in Inventory, must be in Module

2. **DON'T use different IDs**
   - Always use sourceProductId to track relationship

3. **DON'T have price/stock mismatches**
   - If they differ, something is broken

4. **DON'T skip sync on any operation**
   - Create, Update, Delete - ALL must sync

---

## IMPLEMENTATION CHECKLIST

### Product Create
- [ ] Flooring POST → Creates in inventory_products
- [ ] Inventory POST (locked to module) → Creates in flooring_products

### Product Update  
- [ ] Flooring PUT → Updates inventory_products
- [ ] Inventory PUT → Updates flooring_products (if synced)

### Stock Update
- [ ] Any stock change → Updates BOTH collections
- [ ] Dispatch deduct → Updates inventory_products → Triggers module update

### Product Delete
- [ ] Flooring DELETE → Soft deletes in inventory_products
- [ ] Inventory DELETE (synced) → Just deactivates, doesn't delete source

---

## KEY DATABASE RELATIONSHIPS

```
flooring_products                    inventory_products
┌─────────────────────┐             ┌─────────────────────┐
│ id: "abc-123"       │◄───────────►│ sourceProductId:    │
│ name: "Oak Wood"    │             │   "abc-123"         │
│ sku: "OAK-001"      │             │ id: "inv-456"       │
│ stockQuantity: 100  │ ◄═══════════│ stockQuantity: 100  │
│ pricing:            │   MUST BE   │ sellingPrice: 500   │
│   sellingPrice: 500 │   IDENTICAL │ name: "Oak Wood"    │
│                     │             │ sourceModuleId:     │
│                     │             │   "wooden-flooring" │
└─────────────────────┘             └─────────────────────┘
```
