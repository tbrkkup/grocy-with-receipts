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
				Grocy.FrontendHelpers.EndUiBusy();
				if (addAnother)
				{
					window.location.href = U('/receipt/new');
				}
				else
				{
					window.location.href = U('/receipt/' + result.created_object_id);
				}
			},
			function (xhr)
			{
				Grocy.FrontendHelpers.EndUiBusy();
				console.error(xhr);
			}
		);
	}
	else
	{
		Grocy.Api.Put('objects/receipts/' + Grocy.EditObjectId, jsonData,
			function ()
			{
				Grocy.FrontendHelpers.EndUiBusy();
				Grocy.FrontendHelpers.LeaveDialog();
			},
			function (xhr)
			{
				Grocy.FrontendHelpers.EndUiBusy();
				console.error(xhr);
			}
		);
	}
});

$(document).on('change', '#receipt-file', function ()
{
	var fileName = $(this)[0].files.length > 0 ? $(this)[0].files[0].name : 'No file selected';
	$('#receipt-file-label').text(fileName);
});

$(document).on('click', '#add-receipt-file-button', function (e)
{
	e.preventDefault();

	var fileInput = $('#receipt-file')[0];
	if (fileInput.files.length === 0)
	{
		return;
	}

	Grocy.FrontendHelpers.BeginUiBusy();

	var uploadedFileName = RandomString() + CleanFileName(fileInput.files[0].name);

	Grocy.Api.UploadFile(fileInput.files[0], 'receipts', uploadedFileName,
		function ()
		{
			Grocy.Api.Post('objects/receipt_files', { receipt_id: Grocy.EditObjectId, file_name: uploadedFileName },
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
