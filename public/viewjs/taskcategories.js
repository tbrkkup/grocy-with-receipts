var categoriesTable = $('#taskcategories-table').DataTable({
	'order': [[2, 'asc']],
	'columnDefs': [
		{ 'orderable': false, 'targets': 0 },
		{ 'searchable': false, 'targets': 0 },
		{ 'orderable': false, 'targets': 1 },
		{ 'searchable': false, "targets": 1 }
	].concat($.fn.dataTable.defaults.columnDefs)
});
$('#taskcategories-table tbody').removeClass("d-none");
categoriesTable.columns.adjust().draw();

$("#search").on("keyup", Delay(function()
{
	var value = $(this).val();
	if (value === "all")
	{
		value = "";
	}

	categoriesTable.search(value).draw();
}, Grocy.FormFocusDelay));

$("#clear-filter-button").on("click", function()
{
	$("#search").val("");
	categoriesTable.search("").draw();
});

$(document).on('click', '.task-category-delete-button', function(e)
{
	var objectName = $(e.currentTarget).attr('data-category-name');
	var objectId = $(e.currentTarget).attr('data-category-id');

	bootbox.confirm({
		message: __t('Are you sure you want to delete task category "%s"?', objectName),
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
				Grocy.Api.Delete('objects/task_categories/' + objectId, {},
					function(result)
					{
						window.location.href = U('/taskcategories');
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
		window.location.href = U('/taskcategories?include_disabled');
	}
	else
	{
		window.location.href = U('/taskcategories');
	}
});

if (GetUriParam('include_disabled'))
{
	$("#show-disabled").prop('checked', true);
}

var XBulkSelect = new Grocy.Components.BulkSelect({
	tableSelector: "#taskcategories-table",
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
				Grocy.Api.Delete("objects/task_categories/bulk", { object_ids: objectIds },
					function (result) { window.location.reload(); },
					function (xhr) { Grocy.FrontendHelpers.ShowGenericError("Error while bulk deleting", xhr.response); }
				);
			}
		}
	});
});
