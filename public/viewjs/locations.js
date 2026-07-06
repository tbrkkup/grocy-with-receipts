var locationsTable = $('#locations-table').DataTable({
	'order': [], // serverseitige Pfad-Reihenfolge (Baum) beibehalten
	'columnDefs': [
		{ 'orderable': false, 'targets': 0 },
		{ 'orderable': false, 'targets': 1 },
		{ 'searchable': false, "targets": 0 },
		{ 'searchable': false, "targets": 1 }
	].concat($.fn.dataTable.defaults.columnDefs)
});
$('#locations-table tbody').removeClass("d-none");
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

$(document).on('click', '.location-delete-button', function(e)
{
	if ($(e.currentTarget).attr('data-has-children') === '1')
	{
		bootbox.alert(__t('This location has sub-locations. Please move or delete them first.'));
		return;
	}

	var objectName = $(e.currentTarget).attr('data-location-name');
	var objectId = $(e.currentTarget).attr('data-location-id');

	bootbox.confirm({
		message: __t('Are you sure you want to delete location "%s"?', objectName),
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
				Grocy.Api.Delete('objects/locations/' + objectId, {},
					function(result)
					{
						window.location.href = U('/locations');
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
		window.location.href = U('/locations?include_disabled');
	}
	else
	{
		window.location.href = U('/locations');
	}
});

if (GetUriParam('include_disabled'))
{
	$("#show-disabled").prop('checked', true);
}

var locationsBulkSelect = new Grocy.Components.BulkSelect({
	tableSelector: "#locations-table",
	toolbarSelector: "#bulk-edit-toolbar",
	countSelector: "#bulk-edit-selected-count"
});

$("#bulk-edit-delete-button").on("click", function (e)
{
	var objectIds = locationsBulkSelect.GetSelectedIds();

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
				Grocy.Api.Delete("objects/locations/bulk", { object_ids: objectIds },
					function (result) { window.location.reload(); },
					function (xhr) { Grocy.FrontendHelpers.ShowGenericError("Error while bulk deleting", xhr.response); }
				);
			}
		}
	});
});
