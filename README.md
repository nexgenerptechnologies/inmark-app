# Inmark App
Custom Frappe / ERPNext app for Inmark Exports.

## Features Included:
- **Finished Goods Packaging & Dimensions:**
  - Product Dimension (LxWxH cm)
  - Product Packing Size (LxWxH cm) with automatic CBM calculation: `(L × W × H) / 1,000,000`
  - Multi-tier Carton Details Child Table (`Item Carton Detail`) supporting 1 or more Inner Cartons and Master Cartons:
    - Outer dimensions (LxWxH cm)
    - Unit CBM
    - Quantity
    - Total CBM = `Unit CBM × Quantity`
    - Cumulative Carton CBM auto-summed to `custom_total_carton_cbm`
  - Net Weight (Kg) and Gross Weight (Kg)
  - All fields conditionally visible only when **Is Finished Good** is checked.
- Real-time client-side calculation in desk form (`item.js`).
- Server-side calculation hook (`before_save`) for imports and API sync.
