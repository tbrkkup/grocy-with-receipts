var locationsTable = $('#shoppinglocations-table').DataTable({
	'order': [], // serverseitige Pfad-Reihenfolge (Baum) beibehalten
	'columnDefs': [
		{ 'orderable': false, 'targets': 0 },
		{ 'orderable': false, 'targets': 1 },
		{ 'searchable': false, "targets": 0 },
		{ 'searchable': false, "targets": 1 }
	].concat($.fn.dataTable.defaults.columnDefs)
});
$('#shoppinglocations-table tbody').removeClass("d-none");
locationsTable.columns.adjust().draw();

$("#search").on("keyup", Delay(function()
{
	var value = $(this).val();
	if (value === "all")
	{
		value = "";
	}

	locationsTable.search(value).draw();
}, Grocy.FormFocusDelay));

$("#clear-filter-button").on("click", function()
{
	$("#search").val("");
	locationsTable.search("").draw();
});

$(document).on('click', '.shoppinglocation-delete-button', function(e)
{
	if ($(e.currentTarget).attr('data-has-children') === '1')
	{
		bootbox.alert(__t('This store has branches. Please move or delete them first.'));
		return;
	}

	var objectName = $(e.currentTarget).attr('data-shoppinglocation-name');
	var objectId = $(e.currentTarget).attr('data-shoppinglocation-id');

	bootbox.confirm({
		message: __t('Are you sure you want to delete store "%s"?', objectName),
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
		callback: function(result)
		{
			if (result === true)
			{
				Grocy.Api.Delete('objects/shopping_locations/' + objectId, {},
					function(result)
					{
						window.location.href = U('/shoppinglocations');
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
		window.location.href = U('/shoppinglocations?include_disabled');
	}
	else
	{
		window.location.href = U('/shoppinglocations');
	}
});

if (GetUriParam('include_disabled'))
{
	$("#show-disabled").prop('checked', true);
}

var shoppingLocationsBulkSelect = new Grocy.Components.BulkSelect({
	tableSelector: "#shoppinglocations-table",
	toolbarSelector: "#bulk-edit-toolbar",
	countSelector: "#bulk-edit-selected-count"
});

$("#bulk-edit-delete-button").on("click", function (e)
{
	var objectIds = shoppingLocationsBulkSelect.GetSelectedIds();

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
				Grocy.Api.Delete("objects/shopping_locations/bulk", { object_ids: objectIds },
					function (result) { window.location.reload(); },
					function (xhr) { Grocy.FrontendHelpers.ShowGenericError("Error while bulk deleting", xhr.response); }
				);
			}
		}
	});
});
