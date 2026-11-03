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
	custom_packing_width: function(frm) {
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
	width: function(frm, cdt, cdn) {
		update_carton_row_cbm(frm, cdt, cdn);
	},
	height: function(frm, cdt, cdn) {
		update_carton_row_cbm(frm, cdt, cdn);
	},
	qty: function(frm, cdt, cdn) {
		update_carton_row_cbm(frm, cdt, cdn);
	},
	custom_carton_details_remove: function(frm) {
		update_total_carton_cbm(frm);
	}
});

function update_product_packing_cbm(frm) {
	let l = flt(frm.doc.custom_packing_length);
	let w = flt(frm.doc.custom_packing_width);
	let h = flt(frm.doc.custom_packing_height);
	if (l && w && h) {
		let cbm = (l * w * h) / 1000000.0;
		frm.set_value('custom_product_packing_cbm', flt(cbm, 4));
	} else {
		frm.set_value('custom_product_packing_cbm', 0);
	}
}

function update_carton_row_cbm(frm, cdt, cdn) {
	let row = locals[cdt][cdn];
	let l = flt(row.length);
	let w = flt(row.width);
	let h = flt(row.height);
	let qty = flt(row.qty) || 1.0;

	if (l && w && h) {
		let unit_cbm = flt((l * w * h) / 1000000.0, 4);
		frappe.model.set_value(cdt, cdn, 'unit_cbm', unit_cbm);
		frappe.model.set_value(cdt, cdn, 'total_cbm', flt(unit_cbm * qty, 4));
	} else {
		frappe.model.set_value(cdt, cdn, 'unit_cbm', 0);
		frappe.model.set_value(cdt, cdn, 'total_cbm', 0);
	}
	update_total_carton_cbm(frm);
}

function update_total_carton_cbm(frm) {
	let total = 0.0;
	(frm.doc.custom_carton_details || []).forEach(function(row) {
		total += flt(row.total_cbm);
	});
	frm.set_value('custom_total_carton_cbm', flt(total, 4));
}

function calculate_all_cbm(frm) {
	update_product_packing_cbm(frm);
	update_total_carton_cbm(frm);
}
