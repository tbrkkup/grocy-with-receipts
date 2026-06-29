var receiptsTable = $('#receipts-table').DataTable({
	'order': [[1, 'desc']],
	'columnDefs': [
		{ 'orderable': false, 'targets': 0 },
		{ 'searchable': false, 'targets': 0 }
	].concat($.fn.dataTable.defaults.columnDefs)
});
$('#receipts-table tbody').removeClass('d-none');
receiptsTable.columns.adjust().draw();

$(document).on('click', '.delete-receipt-button', function (e)
{
	e.preventDefault();

	var objectId = $(e.currentTarget).attr('data-receipt-id');

	bootbox.confirm({
		message: __t('Are you sure to delete this receipt?'),
		closeButton: false,
		buttons: {
			confirm: { label: __t('Yes'), className: 'btn-success' },
			cancel: { label: __t('No'), className: 'btn-danger' }
		},
		callback: function (result)
		{
			if (result === true)
			{
				Grocy.Api.Delete('objects/receipts/' + objectId, {},
					function ()
					{
						animateCSS('#receipt-' + objectId + '-row', 'fadeOut', function ()
						{
							$('#receipt-' + objectId + '-row').remove();
						});
					},
					function (xhr) { console.error(xhr); }
				);
			}
		}
	});
});
