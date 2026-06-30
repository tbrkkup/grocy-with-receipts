var productsTable = $('#products-table').DataTable({
	'order': [[2, 'asc']],
	'columnDefs': [
		{ 'orderable': false, 'targets': 0 },
		{ 'orderable': false, 'targets': 1 },
		{ 'searchable': false, "targets": 0 },
		{ 'searchable': false, "targets": 1 },
		{ 'visible': false, 'targets': 8 },
		{ 'visible': false, 'targets': 9 },
		{ 'visible': false, 'targets': 10 },
		{ "type": "html-num-fmt", "targets": 4 }
	].concat($.fn.dataTable.defaults.columnDefs)
});
$('#products-table tbody').removeClass("d-none");
productsTable.columns.adjust().draw();

$("#search").on("keyup", Delay(function ()
{
	var value = $(this).val();
	if (value === "all")
	{
		value = "";
	}

	productsTable.search(value).draw();
}, Grocy.FormFocusDelay));

$("#product-group-filter").on("change", function ()
{
	var value = $("#product-group-filter option:selected").text();
	if (value === __t("All"))
	{
		productsTable.column(productsTable.colReorder.transpose(7)).search("").draw();
	}
	else
	{
		productsTable.column(productsTable.colReorder.transpose(7)).search("^" + $.fn.dataTable.util.escapeRegex(value) + "$", true, false).draw();
	}

});

$("#clear-filter-button").on("click", function ()
{
	$("#search").val("");
	$("#product-group-filter").val("all");
	productsTable.column(productsTable.colReorder.transpose(7)).search("").draw();
	productsTable.search("").draw();

	if ($("#show-disabled").is(":checked"))
	{
		$("#show-disabled").prop("checked", false);
		RemoveUriParam("include_disabled");
		RemoveUriParam("only_in_stock");
		window.location.reload();
	}

	if ($("#status-filter").val() != "all")
	{
		$("#status-filter").val("all");
		$("#status-filter").trigger("change");
	}
});

if (typeof GetUriParam("product-group") !== "undefined")
{
	$("#product-group-filter").val(GetUriParam("product-group"));
	$("#product-group-filter").trigger("change");
}

$(document).on('click', '.product-delete-button', function (e)
{
	var objectName = $(e.currentTarget).attr('data-product-name');
	var objectId = $(e.currentTarget).attr('data-product-id');

	bootbox.confirm({
		message: __t('Are you sure you want to delete product "%s"?', objectName) + '<br><br>' + __t('This also removes any stock amount, the journal and all other references of this product - consider disabling it instead, if you want to keep that and just hide the product.'),
		closeButton: false,
		buttons: {
			confirm: {
				label: __t('Yes'),
				className: 'btn-success'
			},
			cancel: {
				label: __t('No'),
				className: 'btn-danger'
			}
		},
		callback: function (result)
		{
			if (result === true)
			{
				jsonData = {};
				jsonData.active = 0;
				Grocy.Api.Delete('objects/products/' + objectId, {},
					function (result)
					{
						window.location.href = U('/products');
					},
					function (xhr)
					{
						console.error(xhr);
					}
				);
			}
		}
	});
});

$("#show-disabled").change(function ()
{
	if (this.checked)
	{
		UpdateUriParam("include_disabled", "true");
	}
	else
	{
		RemoveUriParam("include_disabled");
	}

	window.location.reload();
});

$("#status-filter").change(function ()
{
	var value = $(this).val();

	if (value != "all")
	{
		UpdateUriParam("filter", value);
	}
	else
	{
		RemoveUriParam("filter");
	}

	window.location.reload();
});

if (GetUriParam('include_disabled'))
{
	$("#show-disabled").prop('checked', true);
}

if (GetUriParam("filter"))
{
	$("#status-filter").val(GetUriParam("filter"));
}

var productsBulkSelect = new Grocy.Components.BulkSelect({
	tableSelector: "#products-table",
	toolbarSelector: "#bulk-edit-toolbar",
	countSelector: "#bulk-edit-selected-count"
});

function BulkEditProducts(data, successMessage)
{
	Grocy.Api.Put("objects/products/bulk", {
		object_ids: productsBulkSelect.GetSelectedIds(),
		data: data
	},
		function (result)
		{
			window.location.href = U("/products");
		},
		function (xhr)
		{
			Grocy.FrontendHelpers.ShowGenericError("Error while bulk editing", xhr.response);
		}
	);
}

$("#bulk-edit-location-button").on("click", function (e)
{
	var options = $.map(Grocy.Locations, function (location)
	{
		return { text: location.name, value: location.id };
	});

	bootbox.prompt({
		title: __t("Location"),
		inputType: "select",
		inputOptions: options,
		callback: function (result)
		{
			if (result !== null)
			{
				BulkEditProducts({ location_id: result });
			}
		}
	});
});

$("#bulk-edit-shopping-location-button").on("click", function (e)
{
	var options = $.map(Grocy.ShoppingLocations, function (shoppingLocation)
	{
		return { text: shoppingLocation.name, value: shoppingLocation.id };
	});

	bootbox.prompt({
		title: __t("Default store"),
		inputType: "select",
		inputOptions: options,
		callback: function (result)
		{
			if (result !== null)
			{
				BulkEditProducts({ shopping_location_id: result });
			}
		}
	});
});

$("#bulk-edit-product-group-button").on("click", function (e)
{
	var options = $.map(Grocy.ProductGroups, function (productGroup)
	{
		return { text: productGroup.name, value: productGroup.id };
	});

	bootbox.prompt({
		title: __t("Product group"),
		inputType: "select",
		inputOptions: options,
		callback: function (result)
		{
			if (result !== null)
			{
				BulkEditProducts({ product_group_id: result });
			}
		}
	});
});

$("#bulk-edit-min-stock-amount-button").on("click", function (e)
{
	bootbox.prompt({
		title: __t("Min. stock amount"),
		inputType: "number",
		min: 0,
		callback: function (result)
		{
			if (result !== null)
			{
				BulkEditProducts({ min_stock_amount: result });
			}
		}
	});
});

$("#bulk-edit-default-best-before-days-button").on("click", function (e)
{
	bootbox.prompt({
		title: __t("Default best before days"),
		inputType: "number",
		callback: function (result)
		{
			if (result !== null)
			{
				BulkEditProducts({ default_best_before_days: result });
			}
		}
	});
});

$("#bulk-edit-delete-button").on("click", function (e)
{
	var objectIds = productsBulkSelect.GetSelectedIds();

	bootbox.confirm({
		message: __t("Are you sure you want to delete this %s product(s)?", objectIds.length),
		closeButton: false,
		buttons: {
			confirm: {
				label: __t("Yes"),
				className: "btn-success"
			},
			cancel: {
				label: __t("No"),
				className: "btn-danger"
			}
		},
		callback: function (result)
		{
			if (result === true)
			{
				Grocy.Api.Delete("objects/products/bulk", { object_ids: objectIds },
					function (result)
					{
						window.location.href = U("/products");
					},
					function (xhr)
					{
						Grocy.FrontendHelpers.ShowGenericError("Error while bulk deleting", xhr.response);
					}
				);
			}
		}
	});
});

$(".merge-products-button").on("click", function (e)
{
	var productId = $(e.currentTarget).attr("data-product-id");
	$("#merge-products-keep").val(productId);
	$("#merge-products-remove").val("");
	$("#merge-products-modal").modal("show");
});

$("#merge-products-save-button").on("click", function (e)
{
	e.preventDefault();

	if (!Grocy.FrontendHelpers.ValidateForm("merge-products-form", true))
	{
		return;
	}

	var productIdToKeep = $("#merge-products-keep").val();
	var productIdToRemove = $("#merge-products-remove").val();

	Grocy.Api.Post("stock/products/" + productIdToKeep.toString() + "/merge/" + productIdToRemove.toString(), {},
		function (result)
		{
			window.location.href = U('/products');
		},
		function (xhr)
		{
			Grocy.FrontendHelpers.ShowGenericError('Error while merging', xhr.response);
		}
	);
});
