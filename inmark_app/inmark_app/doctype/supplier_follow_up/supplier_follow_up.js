// Copyright (c) 2026, Inmark Exports and contributors
// For license information, please see license.txt

frappe.ui.form.on('Supplier Follow Up', {
	setup: function(frm) {
		frm.set_query('contact_person', function() {
			if (!frm.doc.supplier) return {};
			return {
				query: 'frappe.contacts.doctype.contact.contact.contact_query',
				filters: {
					link_doctype: 'Supplier',
					link_name: frm.doc.supplier
				}
			};
		});

		frm.set_query('selected_po_for_history', function() {
			if (!frm.doc.supplier) return {};
			return {
				filters: {
					supplier: frm.doc.supplier,
					docstatus: 1
				}
			};
		});
	},

	refresh: function(frm) {
		update_summary_counts(frm);
		render_history(frm);

		if (frm.doc.supplier) {
			frm.add_custom_button(__('Select Pending POs'), function() {
				show_po_selection_dialog(frm);
			}, __('Get Items'));
		}
	},

	supplier: function(frm) {
		frm.set_value('contact_person', '');
		frm.set_value('selected_po_for_history', '');
		render_history(frm);

		if (frm.doc.supplier) {
			// Prompt user to fetch pending POs
			show_po_selection_dialog(frm);
		}
	},

	selected_po_for_history: function(frm) {
		render_history(frm);
	}
});

frappe.ui.form.on('Supplier Follow Up Item', {
	item_status: function(frm) {
		update_summary_counts(frm);
	},
	items_remove: function(frm) {
		update_summary_counts(frm);
	}
});

function update_summary_counts(frm) {
	let total = (frm.doc.items || []).length;
	let on_track = 0;
	let delayed = 0;

	(frm.doc.items || []).forEach(row => {
		if (row.item_status === 'On Track') on_track++;
		if (row.item_status === 'Delayed') delayed++;
	});

	frm.set_value('total_items_reviewed', total);
	frm.set_value('items_on_track', on_track);
	frm.set_value('items_delayed', delayed);
}

function show_po_selection_dialog(frm) {
	if (!frm.doc.supplier) {
		frappe.msgprint(__('Please select a Supplier first.'));
		return;
	}

	let d = new frappe.ui.Dialog({
		title: __('Select Purchase Orders for {0}', [frm.doc.supplier]),
		size: 'large',
		fields: [
			{
				fieldtype: 'Check',
				fieldname: 'include_closed',
				label: __('Include Closed & Completed POs'),
				default: 0,
				onchange: function() {
					load_pos();
				}
			},
			{
				fieldtype: 'HTML',
				fieldname: 'pos_html'
			}
		],
		primary_action_label: __('Add Items to Follow-Up'),
		primary_action: function() {
			let selected_pos = [];
			d.$wrapper.find('input[type="checkbox"][data-po]:checked').each(function() {
				selected_pos.push($(this).attr('data-po'));
			});

			if (selected_pos.length === 0) {
				frappe.msgprint(__('Please select at least one Purchase Order.'));
				return;
			}

			d.hide();
			frappe.call({
				method: 'inmark_app.inmark_app.doctype.supplier_follow_up.supplier_follow_up.get_po_items',
				args: {
					purchase_orders: selected_pos
				},
				freeze: true,
				freeze_message: __('Fetching PO Line Items...'),
				callback: function(r) {
					if (r.message && r.message.length > 0) {
						// Existing item codes and POs to avoid duplicate additions
						let existing_keys = new Set(
							(frm.doc.items || []).map(row => `${row.purchase_order}::${row.item_code}`)
						);

						let added_count = 0;
						r.message.forEach(item_data => {
							let key = `${item_data.purchase_order}::${item_data.item_code}`;
							if (!existing_keys.has(key)) {
								let row = frm.add_child('items');
								Object.assign(row, item_data);
								existing_keys.add(key);
								added_count++;
							}
						});

						frm.refresh_field('items');
						update_summary_counts(frm);
						frappe.show_alert({
							message: __('Added {0} line items from {1} Purchase Orders', [added_count, selected_pos.length]),
							indicator: 'green'
						});
					} else {
						frappe.msgprint(__('No items found in selected Purchase Orders.'));
					}
				}
			});
		}
	});

	function load_pos() {
		let inc_closed = d.get_value('include_closed') ? 1 : 0;
		d.get_field('pos_html').$wrapper.html('<div class="text-muted p-3">Loading Purchase Orders...</div>');

		frappe.call({
			method: 'inmark_app.inmark_app.doctype.supplier_follow_up.supplier_follow_up.get_supplier_pos',
			args: {
				supplier: frm.doc.supplier,
				include_closed: inc_closed
			},
			callback: function(r) {
				let pos = r.message || [];
				if (pos.length === 0) {
					d.get_field('pos_html').$wrapper.html(
						'<div class="text-muted p-4 text-center">No pending Purchase Orders found for this supplier. Check "Include Closed & Completed POs" if you wish to follow up on completed orders.</div>'
					);
					return;
				}

				let html = `
				<div style="max-height: 380px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 6px;">
					<table class="table table-bordered table-hover mb-0" style="font-size: 13px;">
						<thead style="background: #f8fafc; position: sticky; top: 0; z-index: 1;">
							<tr>
								<th style="width: 40px; text-align: center;">
									<input type="checkbox" id="select-all-pos">
								</th>
								<th>Purchase Order</th>
								<th>PO Date</th>
								<th>Delivery Date</th>
								<th>Status</th>
								<th>Grand Total</th>
							</tr>
						</thead>
						<tbody>
				`;

				pos.forEach(po => {
					let status_badge = po.status === 'Completed' ? 'badge-success' : (po.status === 'To Receive' ? 'badge-warning' : 'badge-info');
					html += `
							<tr>
								<td style="text-align: center;">
									<input type="checkbox" data-po="${po.name}">
								</td>
								<td><strong>${po.name}</strong></td>
								<td>${frappe.datetime.str_to_user(po.transaction_date)}</td>
								<td>${po.schedule_date ? frappe.datetime.str_to_user(po.schedule_date) : '-'}</td>
								<td><span class="badge ${status_badge}">${po.status}</span></td>
								<td style="text-align: right; font-weight: 500;">${format_currency(po.grand_total, po.currency)}</td>
							</tr>
					`;
				});

				html += `
						</tbody>
					</table>
				</div>
				`;

				d.get_field('pos_html').$wrapper.html(html);

				// Bind select all
				d.$wrapper.find('#select-all-pos').on('change', function() {
					let checked = $(this).prop('checked');
					d.$wrapper.find('input[type="checkbox"][data-po]').prop('checked', checked);
				});
			}
		});
	}

	d.show();
	load_pos();
}

function render_history(frm) {
	if (!frm.doc.supplier) {
		frm.get_field('history_html').$wrapper.html(
			'<div class="text-muted p-4 text-center">Please select a Supplier to view follow-up history.</div>'
		);
		return;
	}

	frappe.call({
		method: 'inmark_app.inmark_app.doctype.supplier_follow_up.supplier_follow_up.get_history_html',
		args: {
			supplier: frm.doc.supplier,
			purchase_order: frm.doc.selected_po_for_history || null,
			current_docname: frm.doc.name || null
		},
		callback: function(r) {
			frm.get_field('history_html').$wrapper.html(r.message || '');
		}
	});
}
