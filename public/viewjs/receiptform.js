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
					Grocy.FrontendHelpers.LeaveDialog();
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
