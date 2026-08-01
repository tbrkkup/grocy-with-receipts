var countriesTable = $('#countries-table').DataTable({
	'order': [[1, 'asc']],
	'columnDefs': [
		{ 'orderable': false, 'targets': 0 },
		{ 'searchable': false, "targets": 0 }
	].concat($.fn.dataTable.defaults.columnDefs)
});
$('#countries-table tbody').removeClass("d-none");
countriesTable.columns.adjust().draw();

$("#search").on("keyup", Delay(function()
{
	var value = $(this).val();
	if (value === "all")
	{
		value = "";
	}

	countriesTable.search(value).draw();
}, Grocy.FormFocusDelay));

$("#clear-filter-button").on("click", function()
{
	$("#search").val("");
	countriesTable.search("").draw();
});

$(document).on('click', '.country-delete-button', function(e)
{
	var objectName = $(e.currentTarget).attr('data-country-name');
	var objectId = $(e.currentTarget).attr('data-country-id');

	bootbox.confirm({
		message: __t('Are you sure you want to delete country "%s"?', objectName),
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
				Grocy.Api.Delete('objects/countries/' + objectId, {},
					function(result)
					{
						window.location.href = U('/countries');
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
		window.location.href = U('/countries?include_disabled');
	}
	else
	{
		window.location.href = U('/countries');
	}
});

if (GetUriParam('include_disabled'))
{
	$("#show-disabled").prop('checked', true);
}
