var receiptsTable = $('#receipts-table').DataTable({
	'order': [[1, 'desc']],
	'columnDefs': [
		{ 'orderable': false, 'targets': 0 },
		{ 'searchable': false, "targets": 0 }
	].concat($.fn.dataTable.defaults.columnDefs)
});
$('#receipts-table tbody').removeClass("d-none");
receiptsTable.columns.adjust().draw();

$("#search").on("keyup", Delay(function()
{
	var value = $(this).val();
	if (value === "all")
	{
		value = "";
	}

	receiptsTable.search(value).draw();
}, Grocy.FormFocusDelay));

$("#status-filter").on("change", function()
{
	var value = $(this).val();
	receiptsTable.column(3).search(value).draw();
});

$("#clear-filter-button").on("click", function()
{
	$("#search").val("");
	$("#status-filter").val("");
	receiptsTable.search("").columns().search("").draw();
});

$(document).on('click', '.receipt-delete-button', function(e)
{
	var objectId = $(e.currentTarget).attr('data-receipt-id');

	bootbox.confirm({
		message: __t('Are you sure you want to delete this receipt?'),
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
				Grocy.Api.Delete('objects/receipts/' + objectId, {},
					function(result)
					{
						window.location.href = U('/receipts');
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
