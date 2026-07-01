function ReceiptFormLeave(addAnother)
{
	Grocy.FrontendHelpers.EndUiBusy();

	if (addAnother)
	{
		window.location.href = U('/receipt/new' + (GetUriParam("embedded") !== undefined ? '?embedded' : ''));
	}
	else if (GetUriParam("embedded") !== undefined)
	{
		window.parent.postMessage(WindowMessageBag("Reload"), Grocy.BaseUrl);
	}
	else
	{
		window.location.href = U('/receipts');
	}
}

// Uploads all files currently selected in the file input and links them to the
// given receipt, then calls the callback. Uploads run sequentially so a failure
// stops the chain and surfaces the error.
function UploadReceiptFiles(receiptId, callback)
{
	var fileInput = $('#receipt-file')[0];
	var files = (fileInput && fileInput.files) ? Array.prototype.slice.call(fileInput.files) : [];

	if (files.length === 0)
	{
		callback();
		return;
	}

	var index = 0;

	function UploadNext()
	{
		if (index >= files.length)
		{
			callback();
			return;
		}

		var file = files[index];
		var uploadedFileName = RandomString() + CleanFileName(file.name);

		Grocy.Api.UploadFile(file, 'receipts', uploadedFileName,
			function ()
			{
				Grocy.Api.Post('objects/receipt_files', { receipt_id: receiptId, file_name: uploadedFileName },
					function ()
					{
						index++;
						UploadNext();
					},
					function (xhr)
					{
						Grocy.FrontendHelpers.EndUiBusy();
						console.error(xhr);
						Grocy.FrontendHelpers.ShowGenericError('Error while uploading a file', xhr.response);
					}
				);
			},
			function (xhr)
			{
				Grocy.FrontendHelpers.EndUiBusy();
				console.error(xhr);
				Grocy.FrontendHelpers.ShowGenericError('Error while uploading a file', xhr.response);
			}
		);
	}

	UploadNext();
}

$(document).on('click', '.save-receipt-button', function (e)
{
	e.preventDefault();

	if (!Grocy.FrontendHelpers.ValidateForm('receipt-form'))
	{
		return;
	}

	Grocy.FrontendHelpers.BeginUiBusy();

	var addAnother = $(e.currentTarget).hasClass('add-another');
	var jsonData = $('#receipt-form').serializeJSON();
	jsonData.date = Grocy.Components.DateTimePicker.GetValue();

	if (Grocy.EditMode === 'create')
	{
		Grocy.Api.Post('objects/receipts', jsonData,
			function (result)
			{
				UploadReceiptFiles(result.created_object_id, function ()
				{
					ReceiptFormLeave(addAnother);
				});
			},
			function (xhr)
			{
				Grocy.FrontendHelpers.EndUiBusy();
				console.error(xhr);
				Grocy.FrontendHelpers.ShowGenericError('Error while saving, probably this item already exists', xhr.response);
			}
		);
	}
	else
	{
		Grocy.Api.Put('objects/receipts/' + Grocy.EditObjectId, jsonData,
			function ()
			{
				UploadReceiptFiles(Grocy.EditObjectId, function ()
				{
					ReceiptFormLeave(false);
				});
			},
			function (xhr)
			{
				Grocy.FrontendHelpers.EndUiBusy();
				console.error(xhr);
				Grocy.FrontendHelpers.ShowGenericError('Error while saving', xhr.response);
			}
		);
	}
});

$(document).on('change', '#receipt-file', function ()
{
	var files = $(this)[0].files;
	var label = __t('No file selected');

	if (files.length === 1)
	{
		label = files[0].name;
	}
	else if (files.length > 1)
	{
		label = files.length + ' ' + __t('files selected');
	}

	$('#receipt-file-label').text(label);
});

$(document).on('click', '.delete-receipt-file-button', function (e)
{
	e.preventDefault();

	var receiptFileId = $(this).data('receipt-file-id');
	var fileName = $(this).data('file-name');

	Grocy.FrontendHelpers.BeginUiBusy();

	Grocy.Api.Delete('objects/receipt_files/' + receiptFileId, {},
		function ()
		{
			Grocy.Api.DeleteFile(fileName, 'receipts',
				function ()
				{
					window.location.reload();
				},
				function (xhr)
				{
					Grocy.FrontendHelpers.EndUiBusy();
					console.error(xhr);
				}
			);
		},
		function (xhr)
		{
			Grocy.FrontendHelpers.EndUiBusy();
			console.error(xhr);
		}
	);
});
