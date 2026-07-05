var aliasesTable = $('#receiptaliases-table').DataTable({
	'order': [[1, 'asc']],
	'columnDefs': [
		{ 'orderable': false, 'targets': 0 },
		{ 'searchable': false, 'targets': 0 }
	].concat($.fn.dataTable.defaults.columnDefs)
});
$('#receiptaliases-table tbody').removeClass("d-none");
aliasesTable.columns.adjust().draw();

$("#search").on("keyup", Delay(function()
{
	var value = $(this).val();
	if (value === "all")
	{
		value = "";
	}

	aliasesTable.search(value).draw();
}, Grocy.FormFocusDelay));

$("#clear-filter-button").on("click", function()
{
	$("#search").val("");
	aliasesTable.search("").draw();
});

$(document).on('click', '.receiptalias-delete-button', function(e)
{
	var objectText = $(e.currentTarget).attr('data-receiptalias-text');
	var objectId = $(e.currentTarget).attr('data-receiptalias-id');

	bootbox.confirm({
		message: __t('Are you sure you want to delete the receipt alias "%s"?', objectText),
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
				Grocy.Api.Delete('objects/product_receipt_aliases/' + objectId, {},
					function(result)
					{
						window.location.href = U('/receiptaliases');
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
