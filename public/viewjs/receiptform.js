$('#save-receipt-button').on('click', function(e)
{
	e.preventDefault();

	var jsonData = $('#receipt-form').serializeJSON();
	Grocy.FrontendHelpers.BeginUiBusy("receipt-form");

	if (Grocy.EditMode === 'create')
	{
		Grocy.Api.Post('objects/receipts', jsonData,
			function(result)
			{
				if (GetUriParam("embedded") !== undefined)
				{
					window.parent.postMessage(WindowMessageBag("Reload"), Grocy.BaseUrl);
				}
				else
				{
					window.location.href = U('/receipts');
				}
			},
			function(xhr)
			{
				Grocy.FrontendHelpers.EndUiBusy("receipt-form");
				Grocy.FrontendHelpers.ShowGenericError('Error while saving', xhr.response);
			}
		);
	}
	else
	{
		Grocy.Api.Put('objects/receipts/' + Grocy.EditObjectId, jsonData,
			function(result)
			{
				if (GetUriParam("embedded") !== undefined)
				{
					window.parent.postMessage(WindowMessageBag("Reload"), Grocy.BaseUrl);
				}
				else
				{
					window.location.href = U('/receipts');
				}
			},
			function(xhr)
			{
				Grocy.FrontendHelpers.EndUiBusy("receipt-form");
				Grocy.FrontendHelpers.ShowGenericError('Error while saving', xhr.response);
			}
		);
	}
});

if (Grocy.EditMode === 'edit')
{
	$('#receipt-file-upload').on('change', function()
	{
		var fileName = $(this).val().split('\\').pop();
		$(this).siblings('.custom-file-label').text(fileName);
	});

	$('#receipt-file-upload-button').on('click', function(e)
	{
		e.preventDefault();
		var fileInput = document.getElementById('receipt-file-upload');
		if (!fileInput.files.length)
		{
			return;
		}

		var file = fileInput.files[0];
		var fileName = file.name;

		Grocy.Api.UploadFile(file, 'receipts', fileName,
			function()
			{
				Grocy.Api.Post('objects/receipt_files', {
					receipt_id: Grocy.EditObjectId,
					file_name: fileName
				},
				function()
				{
					window.location.reload();
				},
				function(xhr)
				{
					Grocy.FrontendHelpers.ShowGenericError('Error saving file reference', xhr.response);
				});
			},
			function(xhr)
			{
				Grocy.FrontendHelpers.ShowGenericError('Error uploading file', xhr.response);
			}
		);
	});

	$(document).on('click', '.receipt-file-delete-button', function(e)
	{
		e.preventDefault();
		var fileId = $(e.currentTarget).attr('data-file-id');
		var fileName = $(e.currentTarget).attr('data-file-name');

		bootbox.confirm({
			message: __t('Are you sure you want to delete this file?'),
			closeButton: false,
			buttons: {
				confirm: { label: __t('Yes'), className: 'btn-success' },
				cancel: { label: __t('No'), className: 'btn-danger' }
			},
			callback: function(result)
			{
				if (result === true)
				{
					Grocy.Api.DeleteFile(fileName, 'receipts',
						function()
						{
							Grocy.Api.Delete('objects/receipt_files/' + fileId, {},
								function() { window.location.reload(); },
								function(xhr) { console.error(xhr); }
							);
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
}
