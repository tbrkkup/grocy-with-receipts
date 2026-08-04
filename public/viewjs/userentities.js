var userentitiesTable = $('#userentities-table').DataTable({
	'order': [[2, 'asc']],
	'columnDefs': [
		{ 'orderable': false, 'targets': 0 },
		{ 'searchable': false, 'targets': 0 },
		{ 'orderable': false, 'targets': 1 },
		{ 'searchable': false, "targets": 1 }
	].concat($.fn.dataTable.defaults.columnDefs)
});
$('#userentities-table tbody').removeClass("d-none");
userentitiesTable.columns.adjust().draw();

$("#search").on("keyup", Delay(function()
{
	var value = $(this).val();
	if (value === "all")
	{
		value = "";
	}

	userentitiesTable.search(value).draw();
}, Grocy.FormFocusDelay));

$("#clear-filter-button").on("click", function()
{
	$("#search").val("");
	userentitiesTable.search("").draw();
});

$(document).on('click', '.userentity-delete-button', function(e)
{
	var objectName = $(e.currentTarget).attr('data-userentity-name');
	var objectId = $(e.currentTarget).attr('data-userentity-id');

	bootbox.confirm({
		message: __t('Are you sure you want to delete userentity "%s"?', objectName),
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
				Grocy.Api.Delete('objects/userentities/' + objectId, {},
					function(result)
					{
						window.location.href = U('/userentities');
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

var XBulkSelect = new Grocy.Components.BulkSelect({
	tableSelector: "#userentities-table",
	toolbarSelector: "#bulk-edit-toolbar",
	countSelector: "#bulk-edit-selected-count"
});

$("#bulk-edit-delete-button").on("click", function (e)
{
	var objectIds = XBulkSelect.GetSelectedIds();

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
				Grocy.Api.Delete("objects/userentities/bulk", { object_ids: objectIds },
					function (result) { window.location.reload(); },
					function (xhr) { Grocy.FrontendHelpers.ShowGenericError("Error while bulk deleting", xhr.response); }
				);
			}
		}
	});
});
