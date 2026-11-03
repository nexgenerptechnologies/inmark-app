app_name = "inmark_app"
app_title = "Inmark App"
app_publisher = "Inmark Exports"
app_description = "Custom app for Inmark Exports"
app_email = "varun@inmark.co.in"
app_license = "mit"

# Includes in <head>
# ------------------
doctype_js = {
    "Item": "public/js/item.js"
}

# Document Events
# ---------------
doc_events = {
    "Item": {
        "before_save": "inmark_app.custom.item.before_save"
    }
}

# Fixtures for Custom Fields
# --------------------------
fixtures = [
    {
        "dt": "Custom Field",
        "filters": [
            [
                "name",
                "in",
                [
                    "Item-custom_is_finished_good",
                    "Item-custom_section_fg_packaging",
                    "Item-custom_col_product_dim",
                    "Item-custom_product_length",
                    "Item-custom_product_breadth",
                    "Item-custom_product_height",
                    "Item-custom_col_product_packing",
                    "Item-custom_packing_length",
                    "Item-custom_packing_breadth",
                    "Item-custom_packing_height",
                    "Item-custom_product_packing_cbm",
                    "Item-custom_section_carton_break",
                    "Item-custom_carton_details",
                    "Item-custom_section_fg_summary",
                    "Item-custom_total_carton_cbm",
                    "Item-custom_col_weights",
                    "Item-custom_net_weight_kg",
                    "Item-custom_gross_weight_kg"
                ]
            ]
        ]
    }
]
