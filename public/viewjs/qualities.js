var qualitiesTable = $('#qualities-table').DataTable({
	'order': [[1, 'asc']],
	'columnDefs': [
		{ 'orderable': false, 'targets': 0 },
		{ 'searchable': false, "targets": 0 }
	].concat($.fn.dataTable.defaults.columnDefs)
});
$('#qualities-table tbody').removeClass("d-none");
qualitiesTable.columns.adjust().draw();

$("#search").on("keyup", Delay(function()
{
	var value = $(this).val();
	if (value === "all")
	{
		value = "";
	}

	qualitiesTable.search(value).draw();
}, Grocy.FormFocusDelay));

$("#clear-filter-button").on("click", function()
{
	$("#search").val("");
	qualitiesTable.search("").draw();
});

$(document).on('click', '.quality-delete-button', function(e)
{
	var objectName = $(e.currentTarget).attr('data-quality-name');
	var objectId = $(e.currentTarget).attr('data-quality-id');

	bootbox.confirm({
		message: __t('Are you sure you want to delete quality "%s"?', objectName),
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
				Grocy.Api.Delete('objects/qualities/' + objectId, {},
					function(result)
					{
						window.location.href = U('/qualities');
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
		window.location.href = U('/qualities?include_disabled');
	}
	else
	{
		window.location.href = U('/qualities');
	}
});

if (GetUriParam('include_disabled'))
{
	$("#show-disabled").prop('checked', true);
}
