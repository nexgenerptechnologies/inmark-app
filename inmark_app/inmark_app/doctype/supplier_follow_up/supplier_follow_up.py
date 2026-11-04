# Copyright (c) 2026, Inmark Exports and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import flt, formatdate, get_datetime

class SupplierFollowUp(Document):
	def validate(self):
		self.update_summary()

	def update_summary(self):
		self.total_items_reviewed = len(self.items or [])
		self.items_on_track = sum(1 for d in (self.items or []) if d.item_status == "On Track")
		self.items_delayed = sum(1 for d in (self.items or []) if d.item_status == "Delayed")

@frappe.whitelist()
def get_supplier_pos(supplier, include_closed=0):
	"""
	Returns submitted Purchase Orders for the selected supplier.
	Optionally includes Closed and Completed POs.
	"""
	if not supplier:
		return []

	include_closed = int(include_closed or 0)
	filters = {
		"supplier": supplier,
		"docstatus": 1
	}

	if not include_closed:
		filters["status"] = ["not in", ["Closed", "Completed", "Cancelled"]]
	else:
		filters["status"] = ["!=", "Cancelled"]

	pos = frappe.get_all(
		"Purchase Order",
		filters=filters,
		fields=["name", "transaction_date", "schedule_date", "grand_total", "currency", "status"],
		order_by="transaction_date desc"
	)
	return pos

@frappe.whitelist()
def get_po_items(purchase_orders):
	"""
	Fetches line items for selected Purchase Orders.
	Computes pending quantity and fetches previous follow-up note for each item.
	"""
	if isinstance(purchase_orders, str):
		import json
		try:
			purchase_orders = json.loads(purchase_orders)
		except Exception:
			purchase_orders = [purchase_orders]

	if not purchase_orders:
		return []

	po_status_map = {
		d.name: d.status
		for d in frappe.get_all("Purchase Order", filters={"name": ["in", purchase_orders]}, fields=["name", "status"])
	}

	items = frappe.get_all(
		"Purchase Order Item",
		filters={"parent": ["in", purchase_orders]},
		fields=[
			"parent", "item_code", "item_name", "description",
			"qty", "received_qty", "rate", "schedule_date"
		],
		order_by="parent asc, idx asc"
	)

	result = []
	for item in items:
		po_name = item.parent
		item_code = item.item_code
		qty = flt(item.qty)
		rec_qty = flt(item.received_qty)
		pending_qty = max(0.0, qty - rec_qty)

		# Fetch latest past note for this item and PO
		past_note_row = frappe.db.sql("""
			SELECT sfi.note, sf.follow_up_date
			FROM `tabSupplier Follow Up Item` sfi
			JOIN `tabSupplier Follow Up` sf ON sf.name = sfi.parent
			WHERE sfi.purchase_order = %s AND sfi.item_code = %s AND sfi.note IS NOT NULL AND sfi.note != ''
			ORDER BY sf.follow_up_date DESC
			LIMIT 1
		""", (po_name, item_code), as_dict=True)

		past_note = ""
		if past_note_row:
			note_date = formatdate(past_note_row[0].follow_up_date)
			past_note = f"[{note_date}]: {past_note_row[0].note}"

		result.append({
			"purchase_order": po_name,
			"po_status": po_status_map.get(po_name, ""),
			"item_code": item_code,
			"item_name": item.item_name,
			"description": item.description,
			"qty": qty,
			"pending_qty": pending_qty,
			"rate": flt(item.rate),
			"expected_delivery_date": item.schedule_date,
			"revised_delivery_date": item.schedule_date,
			"item_status": "On Track",
			"note": "",
			"past_notes": past_note
		})

	return result

@frappe.whitelist()
def get_history_html(supplier, purchase_order=None, current_docname=None):
	"""
	Generates clean HTML timeline cards of past follow-ups for this supplier / PO.
	"""
	if not supplier:
		return "<div class='text-muted' style='padding: 20px;'>Please select a Supplier first.</div>"

	conditions = ["sf.supplier = %(supplier)s"]
	values = {"supplier": supplier}

	if current_docname:
		conditions.append("sf.name != %(current_docname)s")
		values["current_docname"] = current_docname

	if purchase_order:
		conditions.append("sfi.purchase_order = %(purchase_order)s")
		values["purchase_order"] = purchase_order

	query = f"""
		SELECT
			sf.name as follow_up_id,
			sf.follow_up_date,
			sf.communication_mode,
			sf.followed_up_by,
			sf.meeting_subject,
			sf.minutes_of_meeting,
			sf.next_follow_up_date,
			sfi.purchase_order,
			sfi.item_code,
			sfi.item_name,
			sfi.revised_delivery_date,
			sfi.item_status,
			sfi.note
		FROM `tabSupplier Follow Up` sf
		LEFT JOIN `tabSupplier Follow Up Item` sfi ON sfi.parent = sf.name
		WHERE {" AND ".join(conditions)}
		ORDER BY sf.follow_up_date DESC, sf.name DESC
	"""

	records = frappe.db.sql(query, values, as_dict=True)

	if not records:
		return f"<div class='text-muted' style='padding: 20px;'>No past follow-up history found for {supplier}.</div>"

	# Group by follow-up ID
	grouped = {}
	for r in records:
		fid = r.follow_up_id
		if fid not in grouped:
			grouped[fid] = {
				"follow_up_id": fid,
				"date": r.follow_up_date,
				"mode": r.communication_mode,
				"user": r.followed_up_by,
				"subject": r.meeting_subject or "Follow-Up Discussion",
				"mom": r.minutes_of_meeting,
				"next_date": r.next_follow_up_date,
				"items": []
			}
		if r.purchase_order and r.item_code:
			grouped[fid]["items"].append(r)

	html = """
	<div style="padding: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
	"""

	for fid, data in grouped.items():
		date_str = get_datetime(data["date"]).strftime("%d %b %Y, %I:%M %p")
		next_str = formatdate(data["next_date"]) if data["next_date"] else "Not Scheduled"
		badge_color = "#007bff" if data["mode"] == "In-Person Meeting" else ("#28a745" if data["mode"] == "Phone Call" else "#6c757d")

		html += f"""
		<div style="border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 20px; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.05); overflow: hidden;">
			<div style="background: #f8fafc; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
				<div>
					<span style="font-weight: 600; font-size: 15px; color: #1e293b;">{data["subject"]}</span>
					<span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background: {badge_color}; color: #ffffff; border-radius: 12px; font-size: 11px; font-weight: 500;">{data["mode"]}</span>
				</div>
				<div style="font-size: 13px; color: #64748b;">
					<span>📅 <strong>{date_str}</strong></span> |
					<span>👤 {data["user"]}</span> |
					<span>Next: <strong>{next_str}</strong></span>
				</div>
			</div>
			<div style="padding: 16px;">
		"""

		if data["mom"]:
			html += f"""
				<div style="margin-bottom: 15px; padding: 12px; background: #f1f5f9; border-left: 4px solid #3b82f6; border-radius: 4px;">
					<strong style="color: #334155; font-size: 13px;">Minutes of Meeting (MoM):</strong>
					<div style="margin-top: 6px; font-size: 13px; color: #1e293b; line-height: 1.5;">{data["mom"]}</div>
				</div>
			"""

		if data["items"]:
			html += """
				<table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 10px;">
					<thead>
						<tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left;">
							<th style="padding: 8px 10px; color: #475569;">PO Number</th>
							<th style="padding: 8px 10px; color: #475569;">Item</th>
							<th style="padding: 8px 10px; color: #475569;">Revised Delivery</th>
							<th style="padding: 8px 10px; color: #475569;">Status</th>
							<th style="padding: 8px 10px; color: #475569;">Note / Action Item</th>
						</tr>
					</thead>
					<tbody>
			"""
			for it in data["items"]:
				status_bg = "#dcfce7" if it.item_status == "On Track" else ("#fee2e2" if it.item_status == "Delayed" else "#f3f4f6")
				status_color = "#166534" if it.item_status == "On Track" else ("#991b1b" if it.item_status == "Delayed" else "#374151")
				rev_date = formatdate(it.revised_delivery_date) if it.revised_delivery_date else "-"
				html += f"""
						<tr style="border-bottom: 1px solid #f1f5f9;">
							<td style="padding: 8px 10px; font-weight: 500;"><a href="/desk#Form/Purchase Order/{it.purchase_order}">{it.purchase_order}</a></td>
							<td style="padding: 8px 10px;"><strong>{it.item_code}</strong><br><span style="color: #64748b; font-size: 12px;">{it.item_name or ''}</span></td>
							<td style="padding: 8px 10px; font-weight: 500; color: #0284c7;">{rev_date}</td>
							<td style="padding: 8px 10px;"><span style="padding: 2px 8px; border-radius: 12px; background: {status_bg}; color: {status_color}; font-size: 11px; font-weight: 600;">{it.item_status}</span></td>
							<td style="padding: 8px 10px; color: #1e293b;">{it.note or '<em style="color:#94a3b8;">No note</em>'}</td>
						</tr>
				"""
			html += """
					</tbody>
				</table>
			"""

		html += """
			</div>
		</div>
		"""

	html += "</div>"
	return html
