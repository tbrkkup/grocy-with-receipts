var quantityUnitsTable = $('#quantityunits-table').DataTable({
	'order': [[2, 'asc']],
	'columnDefs': [
		{ 'orderable': false, 'targets': 0 },
		{ 'orderable': false, 'targets': 1 },
		{ 'searchable': false, "targets": 0 },
		{ 'searchable': false, "targets": 1 }
	].concat($.fn.dataTable.defaults.columnDefs)
});
$('#quantityunits-table tbody').removeClass("d-none");
quantityUnitsTable.columns.adjust().draw();

$("#search").on("keyup", Delay(function()
{
	var value = $(this).val();
	if (value === "all")
	{
		value = "";
	}

	quantityUnitsTable.search(value).draw();
}, Grocy.FormFocusDelay));

$("#clear-filter-button").on("click", function()
{
	$("#search").val("");
	quantityUnitsTable.search("").draw();
});

$(document).on('click', '.quantityunit-delete-button', function(e)
{
	var objectName = $(e.currentTarget).attr('data-quantityunit-name');
	var objectId = $(e.currentTarget).attr('data-quantityunit-id');

	bootbox.confirm({
		message: __t('Are you sure you want to delete quantity unit "%s"?', objectName),
		closeButton: false,
		buttons: {
			confirm: {
				label: 'Yes',
				className: 'btn-success'
			},
			cancel: {
				label: 'No',
				className: 'btn-danger'
			}
		},
		callback: function(result)
		{
			if (result === true)
			{
				Grocy.Api.Delete('objects/quantity_units/' + objectId, {},
					function(result)
					{
						window.location.href = U('/quantityunits');
					},
					function(xhr)
					{
						console.error(xhr);
					}
				);
			}
		}
	});
});

$("#show-disabled").change(function()
{
	if (this.checked)
	{
		window.location.href = U('/quantityunits?include_disabled');
	}
	else
	{
		window.location.href = U('/quantityunits');
	}
});

if (GetUriParam('include_disabled'))
{
	$("#show-disabled").prop('checked', true);
}

var quantityUnitsBulkSelect = new Grocy.Components.BulkSelect({
	tableSelector: "#quantityunits-table",
	toolbarSelector: "#bulk-edit-toolbar",
	countSelector: "#bulk-edit-selected-count"
});

$("#bulk-edit-delete-button").on("click", function (e)
{
	var objectIds = quantityUnitsBulkSelect.GetSelectedIds();

	bootbox.confirm({
		message: __t("Are you sure you want to delete this %s item(s)?", objectIds.length),
		closeButton: false,
		buttons: {
			confirm: { label: __t("Yes"), className: "btn-success" },
			cancel: { label: __t("No"), className: "btn-danger" }
		},
		callback: function (result)
		{
			if (result === true)
			{
				Grocy.Api.Delete("objects/quantity_units/bulk", { object_ids: objectIds },
					function (result) { window.location.reload(); },
					function (xhr) { Grocy.FrontendHelpers.ShowGenericError("Error while bulk deleting", xhr.response); }
				);
			}
		}
	});
});
