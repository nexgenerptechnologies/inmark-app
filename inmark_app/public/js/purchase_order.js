// Copyright (c) 2026, Inmark Exports and contributors
// For license information, please see license.txt

frappe.ui.form.on('Purchase Order', {
	refresh: function(frm) {
		if (!frm.is_new()) {
			// Add Follow-Up Action Buttons
			frm.add_custom_button(__('View Follow-Up History'), function() {
				show_po_followup_history(frm);
			}, __('Supplier Follow-Up'));

			frm.add_custom_button(__('Record New Follow-Up'), function() {
				frappe.new_doc('Supplier Follow Up', {
					supplier: frm.doc.supplier
				});
			}, __('Supplier Follow-Up'));
		}
	}
});

function show_po_followup_history(frm) {
	let d = new frappe.ui.Dialog({
		title: __('Follow-Up History for PO: {0}', [frm.doc.name]),
		size: 'large',
		fields: [
			{
				fieldtype: 'HTML',
				fieldname: 'history_html'
			}
		],
		primary_action_label: __('Record New Follow-Up'),
		primary_action: function() {
			d.hide();
			frappe.new_doc('Supplier Follow Up', {
				supplier: frm.doc.supplier
			});
		}
	});

	d.get_field('history_html').$wrapper.html('<div class="text-muted p-4">Loading follow-up history...</div>');
	d.show();

	frappe.call({
		method: 'inmark_app.inmark_app.doctype.supplier_follow_up.supplier_follow_up.get_history_html',
		args: {
			supplier: frm.doc.supplier,
			purchase_order: frm.doc.name
		},
		callback: function(r) {
			d.get_field('history_html').$wrapper.html(r.message || '');
		}
	});
}
