var groupsTable = $('#equipmentgroups-table').DataTable({
	'order': [[2, 'asc']],
	'columnDefs': [
		{ 'orderable': false, 'targets': 0 },
		{ 'orderable': false, 'targets': 1 },
		{ 'searchable': false, "targets": 0 },
		{ 'searchable': false, "targets": 1 }
	].concat($.fn.dataTable.defaults.columnDefs)
});
$('#equipmentgroups-table tbody').removeClass("d-none");
groupsTable.columns.adjust().draw();

$("#search").on("keyup", Delay(function()
{
	var value = $(this).val();
	if (value === "all")
	{
		value = "";
	}

	groupsTable.search(value).draw();
}, Grocy.FormFocusDelay));

$("#clear-filter-button").on("click", function()
{
	$("#search").val("");
	groupsTable.search("").draw();
});

$(document).on('click', '.equipment-group-delete-button', function(e)
{
	var objectName = $(e.currentTarget).attr('data-group-name');
	var objectId = $(e.currentTarget).attr('data-group-id');

	bootbox.confirm({
		message: __t('Are you sure you want to delete equipment group "%s"?', objectName),
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
				Grocy.Api.Delete('objects/equipment_groups/' + objectId, {},
					function(result)
					{
						window.location.href = U('/equipmentgroups');
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
$(window).on("message", function(e)
{
	var data = e.originalEvent.data;

	if (data.Message === "CloseLastModal")
	{
		window.location.reload();
	}
});

$("#show-disabled").change(function()
{
	if (this.checked)
	{
		window.location.href = U('/equipmentgroups?include_disabled');
	}
	else
	{
		window.location.href = U('/equipmentgroups');
	}
});

if (GetUriParam('include_disabled'))
{
	$("#show-disabled").prop('checked', true);
}

var equipmentGroupsBulkSelect = new Grocy.Components.BulkSelect({
	tableSelector: "#equipmentgroups-table",
	toolbarSelector: "#bulk-edit-toolbar",
	countSelector: "#bulk-edit-selected-count"
});

$("#bulk-edit-delete-button").on("click", function (e)
{
	var objectIds = equipmentGroupsBulkSelect.GetSelectedIds();

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
				Grocy.Api.Delete("objects/equipment_groups/bulk", { object_ids: objectIds },
					function (result) { window.location.reload(); },
					function (xhr) { Grocy.FrontendHelpers.ShowGenericError("Error while bulk deleting", xhr.response); }
				);
			}
		}
	});
});
