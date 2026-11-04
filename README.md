# Inmark App
Custom Frappe / ERPNext app for Inmark Exports.

## Features Included:

### 1. Finished Goods Packaging & Dimensions (Item Master):
- **Product Dimension (LxBxH cm)**:
  - Product Length (cm), Product Breadth (cm), Product Height (cm)
  - Product (Kg) & Product Dia (cm)
- **Product Packing Size (LxBxH cm)** with automatic CBM calculation: `(L × B × H) / 1,000,000`
  - Packing Length (cm), Packing Breadth (cm), Packing Height (cm)
  - Product Packing CBM (read-only, auto-calculated)
- **Multi-tier Carton Details Child Table (`Item Carton Detail`)**:
  - Supports 1 or more Inner Cartons and Master Cartons
  - Outer dimensions (Length, Breadth, Height cm), Unit CBM, Quantity, Total CBM
  - Cumulative Carton CBM auto-summed to `custom_total_carton_cbm`
  - Net Weight (Kg) and Gross Weight (Kg)
  - All fields conditionally visible only when **Is Finished Good** is checked.
- Dual client-side and server-side calculation engine.

### 2. Supplier Follow-Up & Minutes of Meeting (MoM) System:
- **`Supplier Follow Up` DocType**:
  - Auto-naming series: `SFU-.YYYY.-.#####`
  - Supplier details, Meeting Date & Time, Communication Mode (Call / Meeting / WhatsApp / Email / Visit), Followed Up By, Next Action Date.
  - **Minutes of Meeting (MoM)**: Meeting subject, attendees, rich-text discussion points and decisions.
  - **Multi-PO Selection**: Choose 1, multiple, or all pending POs (with optional toggle for closed POs) to auto-populate all line items (Item Code, Description, PO Qty, Pending Qty, Rate, Delivery Date).
  - **Line-Item Tracking**: Enter Revised Delivery Date, Status (On Track / Delayed / Dispatched / Partially Received), and individual item notes.
  - **Previous Notes Fetching**: Auto-fetches the latest past note logged for each item so you know what happened in earlier meetings.
  - **Follow-Up Summary Dashboard**: Real-time count of total items reviewed, items on track, and items delayed.
  - **Past Follow-Up History & Closed PO Timeline**: Interactive timeline tab showing past follow-ups, MoMs, and notes for open and closed POs.
  - **Native Purchase Order Integration**: Action buttons on the standard Purchase Order form to view follow-up history or record a new follow-up directly from the PO.
