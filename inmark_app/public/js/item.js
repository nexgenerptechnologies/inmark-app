// Copyright (c) 2026, Inmark Exports and contributors
// For license information, please see license.txt

frappe.ui.form.on('Item', {
	refresh: function(frm) {
		calculate_all_cbm(frm);
	},
	custom_is_finished_good: function(frm) {
		frm.refresh_fields();
	},
	custom_packing_length: function(frm) {
		update_product_packing_cbm(frm);
	},
	custom_packing_breadth: function(frm) {
		update_product_packing_cbm(frm);
	},
	custom_packing_height: function(frm) {
		update_product_packing_cbm(frm);
	}
});

frappe.ui.form.on('Item Carton Detail', {
	length: function(frm, cdt, cdn) {
		update_carton_row_cbm(frm, cdt, cdn);
	},
	breadth: function(frm, cdt, cdn) {
		update_carton_row_cbm(frm, cdt, cdn);
	},
	height: function(frm, cdt, cdn) {
		update_carton_row_cbm(frm, cdt, cdn);
	},
	qty: function(frm, cdt, cdn) {
		update_carton_row_cbm(frm, cdt, cdn);
	},
	carton_type: function(frm) {
		update_carton_totals(frm);
	},
	net_weight: function(frm) {
		update_carton_totals(frm);
	},
	gross_weight: function(frm) {
		update_carton_totals(frm);
	},
	custom_carton_details_remove: function(frm) {
		update_carton_totals(frm);
	}
});

function update_product_packing_cbm(frm) {
	let l = flt(frm.doc.custom_packing_length);
	let b = flt(frm.doc.custom_packing_breadth);
	let h = flt(frm.doc.custom_packing_height);
	if (l && b && h) {
		let cbm = (l * b * h) / 1000000.0;
		frm.set_value('custom_product_packing_cbm', flt(cbm, 4));
	} else {
		frm.set_value('custom_product_packing_cbm', 0);
	}
}

function update_carton_row_cbm(frm, cdt, cdn) {
	let row = locals[cdt][cdn];
	let l = flt(row.length);
	let b = flt(row.breadth);
	let h = flt(row.height);
	let qty = flt(row.qty) || 1.0;

	if (l && b && h) {
		let unit_cbm = flt((l * b * h) / 1000000.0, 4);
		frappe.model.set_value(cdt, cdn, 'unit_cbm', unit_cbm);
		frappe.model.set_value(cdt, cdn, 'total_cbm', flt(unit_cbm * qty, 4));
	} else {
		frappe.model.set_value(cdt, cdn, 'unit_cbm', 0);
		frappe.model.set_value(cdt, cdn, 'total_cbm', 0);
	}
	update_carton_totals(frm);
}

function update_carton_totals(frm) {
	let total_cbm = 0.0;
	let master_net_wt = 0.0;
	let master_gross_wt = 0.0;

	(frm.doc.custom_carton_details || []).forEach(function(row) {
		total_cbm += flt(row.total_cbm);
		if (row.carton_type === 'Master Carton') {
			let qty = flt(row.qty) || 1.0;
			master_net_wt += flt(row.net_weight) * qty;
			master_gross_wt += flt(row.gross_weight) * qty;
		}
	});

	frm.set_value('custom_total_carton_cbm', flt(total_cbm, 4));
	frm.set_value('custom_net_weight_kg', flt(master_net_wt, 3));
	frm.set_value('custom_gross_weight_kg', flt(master_gross_wt, 3));
}

function calculate_all_cbm(frm) {
	update_product_packing_cbm(frm);
	update_carton_totals(frm);
}
