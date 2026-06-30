var receiptsTable = $('#receipts-table').DataTable({
	'order': [[1, 'desc']],
	'columnDefs': [
		{ 'orderable': false, 'targets': 0 },
		{ 'searchable': false, 'targets': 0 }
	].concat($.fn.dataTable.defaults.columnDefs)
});
$('#receipts-table tbody').removeClass('d-none');
receiptsTable.columns.adjust().draw();

var receiptFilesPreviewState = {
	files: [],
	index: 0
};

function IsImageFileName(fileName)
{
	return /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(fileName);
}

function ShowReceiptFilesPreview()
{
	var file = receiptFilesPreviewState.files[receiptFilesPreviewState.index];

	$('#receipt-files-preview-modal-filename').text(file.fileName);

	if (IsImageFileName(file.fileName))
	{
		$('#receipt-files-preview-image').attr('src', file.url).removeClass('d-none');
		$('#receipt-files-preview-pdf').addClass('d-none').attr('src', '');
	}
	else
	{
		$('#receipt-files-preview-pdf').attr('src', file.url).removeClass('d-none');
		$('#receipt-files-preview-image').addClass('d-none').attr('src', '');
	}

	var hasMultipleFiles = receiptFilesPreviewState.files.length > 1;
	$('.receipt-files-preview-prev-button, .receipt-files-preview-next-button').toggleClass('d-none', !hasMultipleFiles);
}

$(document).on('click', '.show-receipt-files-preview-button', function (e)
{
	e.preventDefault();

	var receiptId = $(e.currentTarget).attr('data-receipt-id');
	receiptFilesPreviewState.files = Grocy.ReceiptFilesByReceiptId[receiptId] || [];
	receiptFilesPreviewState.index = 0;

	if (receiptFilesPreviewState.files.length === 0)
	{
		return;
	}

	ShowReceiptFilesPreview();
	$('#receipt-files-preview-modal').modal('show');
});

$(document).on('click', '.receipt-files-preview-prev-button', function ()
{
	receiptFilesPreviewState.index = (receiptFilesPreviewState.index - 1 + receiptFilesPreviewState.files.length) % receiptFilesPreviewState.files.length;
	ShowReceiptFilesPreview();
});

$(document).on('click', '.receipt-files-preview-next-button', function ()
{
	receiptFilesPreviewState.index = (receiptFilesPreviewState.index + 1) % receiptFilesPreviewState.files.length;
	ShowReceiptFilesPreview();
});

$('#receipt-files-preview-modal').on('hidden.bs.modal', function ()
{
	$('#receipt-files-preview-image').attr('src', '');
	$('#receipt-files-preview-pdf').attr('src', '');
});

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
