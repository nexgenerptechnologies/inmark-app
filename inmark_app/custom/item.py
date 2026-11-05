# Copyright (c) 2026, Inmark Exports and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import flt

def before_save(doc, method=None):
	"""
	Server-side hook on Item before_save:
	1. Strict Duplicate Check on Item Code
	2. Calculates Product Packing CBM and Carton CBMs
	3. Calculates Master Carton Weights (Option A)
	"""
	# 1. Strict Duplicate Item Code check on insert
	if doc.is_new() and doc.item_code:
		clean_code = doc.item_code.strip()
		existing = frappe.db.get_value("Item", {"name": clean_code}, "name")
		if existing:
			frappe.throw(f"Item Code '{clean_code}' already exists in the system! Duplicate item creation is not allowed.")

	# 2. Product Packing CBM
	l = flt(doc.get("custom_packing_length"))
	b = flt(doc.get("custom_packing_breadth"))
	h = flt(doc.get("custom_packing_height"))
	if l and b and h:
		doc.custom_product_packing_cbm = flt((l * b * h) / 1000000.0, 4)
	else:
		doc.custom_product_packing_cbm = 0.0

	# 3. Carton Details CBM (Inner & Master Cartons)
	total_carton_cbm = 0.0
	master_net_wt = 0.0
	master_gross_wt = 0.0

	for row in doc.get("custom_carton_details") or []:
		rl = flt(row.get("length"))
		rb = flt(row.get("breadth"))
		rh = flt(row.get("height"))
		rqty = flt(row.get("qty")) or 1.0

		if rl and rb and rh:
			unit_cbm = flt((rl * rb * rh) / 1000000.0, 4)
			row.unit_cbm = unit_cbm
			row.total_cbm = flt(unit_cbm * rqty, 4)
			total_carton_cbm += flt(row.total_cbm)
		else:
			row.unit_cbm = 0.0
			row.total_cbm = 0.0

		# Option A: Auto-fetch from Master Carton
		if row.get("carton_type") == "Master Carton":
			master_net_wt += flt(row.get("net_weight")) * rqty
			master_gross_wt += flt(row.get("gross_weight")) * rqty

	doc.custom_total_carton_cbm = flt(total_carton_cbm, 4)
	doc.custom_net_weight_kg = flt(master_net_wt, 3)
	doc.custom_gross_weight_kg = flt(master_gross_wt, 3)
