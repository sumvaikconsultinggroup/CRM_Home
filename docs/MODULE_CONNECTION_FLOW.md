# Build Inventory - Module Connection Flow

## Overview
Build Inventory can connect to ANY CRM module (Wooden Flooring, D&W, Furniture, etc.) and sync products, dispatches, and invoices dynamically.

## API Endpoints

### 1. Check Current Connection
```
GET /api/inventory/sync/config
```
Returns current connected module info.

### 2. Connect a Module
```
POST /api/inventory/sync/config
Body: { "moduleId": "wooden-flooring", "moduleName": "Wooden Flooring" }
```
- Can only connect ONE module at a time
- Must disconnect first to connect a different module

### 3. Disconnect Module
```
DELETE /api/inventory/sync/config
Optional: ?keepProducts=true (default) or ?keepProducts=false
```
- **keepProducts=true**: Products marked as "disconnected" but kept in inventory
- **keepProducts=false**: Synced products are DELETED (data loss!)

### 4. Sync Products
```
POST /api/inventory/sync
Body: { "moduleId": "wooden-flooring", "syncAll": true }
```

---

## Connection Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MODULE CONNECTION FLOW                            │
└─────────────────────────────────────────────────────────────────────┘

State 1: NO MODULE CONNECTED
┌─────────────────────────────────────────────────────────────────────┐
│  Build Inventory                                                     │
│  - Shows "Connect a Module" option                                   │
│  - No products synced                                                │
│  - Dispatch shows: "No module connected"                             │
│  - Generic fields only                                               │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼ POST /api/inventory/sync/config
                                  { moduleId: "wooden-flooring" }
                                │
State 2: WOODEN FLOORING CONNECTED
┌─────────────────────────────────────────────────────────────────────┐
│  Build Inventory                                                     │
│  - Synced with: Wooden Flooring                                      │
│  - Products: Show flooring-specific fields (thickness, finish, etc.) │
│  - Dispatch: Reads from flooring_dispatches                          │
│  - Invoices: Reads from flooring_invoices                            │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼ DELETE /api/inventory/sync/config
                                  ?keepProducts=true
                                │
State 3: DISCONNECTED (Products Kept)
┌─────────────────────────────────────────────────────────────────────┐
│  Build Inventory                                                     │
│  - No module connected                                               │
│  - Products marked as "disconnected" (sourceType: "disconnected_module")
│  - Products still visible, can be managed manually                   │
│  - Dispatch shows: "No module connected"                             │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼ POST /api/inventory/sync/config
                                  { moduleId: "doors-windows" }
                                │
State 4: DOORS & WINDOWS CONNECTED
┌─────────────────────────────────────────────────────────────────────┐
│  Build Inventory                                                     │
│  - Synced with: Doors & Windows                                      │
│  - Old flooring products: Still visible (disconnected)               │
│  - New D&W products: Synced with D&W fields (material, dimensions)   │
│  - Dispatch: Reads from dw_dispatches                                │
│  - Invoices: Reads from dw_invoices                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Collection Mapping

| Module | Products | Dispatches | Invoices |
|--------|----------|------------|----------|
| wooden-flooring | flooring_products | flooring_dispatches | flooring_invoices |
| doors-windows | dw_products | dw_dispatches | dw_invoices |
| paints-coatings | pc_products | pc_dispatches | pc_invoices |
| furniture | furniture_products | furniture_dispatches | furniture_invoices |
| tiles | tiles_products | tiles_dispatches | tiles_invoices |
| electrical | electrical_products | electrical_dispatches | electrical_invoices |

---

## What Happens on Disconnect?

### Option A: Keep Products (Default)
```
DELETE /api/inventory/sync/config?keepProducts=true
```
- Products remain in `inventory_products`
- `sourceModuleId` set to `null`
- `sourceType` changed to `"disconnected_module"`
- `syncStatus` set to `"disconnected"`
- Products can still be viewed, edited, used for manual orders

### Option B: Remove Products
```
DELETE /api/inventory/sync/config?keepProducts=false
```
- All synced products are DELETED from `inventory_products`
- Sync records are cleared
- ⚠️ DATA LOSS - Use with caution!

---

## Module-Specific Fields

### Wooden Flooring
- thickness, finish, wood_type, grade, construction
- warranty_years, brand, collection

### Doors & Windows
- material, dimensions, glass_type, frame_type
- hardware_included, fire_rating

### Furniture
- material, dimensions, assembly_required
- weight_capacity, color, style

---

## Example: Switching from Flooring to D&W

```javascript
// Step 1: Disconnect Flooring
DELETE /api/inventory/sync/config?keepProducts=true
// Response: { productsAffected: 3, productsKept: true }

// Step 2: Connect D&W
POST /api/inventory/sync/config
{ "moduleId": "doors-windows", "moduleName": "Doors & Windows" }

// Step 3: Sync D&W Products
POST /api/inventory/sync
{ "moduleId": "doors-windows", "syncAll": true }

// Result:
// - Old flooring products: Marked as "disconnected", still visible
// - New D&W products: Synced with D&W fields
// - Dispatch: Now shows D&W dispatches
```
