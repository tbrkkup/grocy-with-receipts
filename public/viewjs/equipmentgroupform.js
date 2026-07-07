$('#save-equipment-group-button').on('click', function(e)
{
	e.preventDefault();

	if (!Grocy.FrontendHelpers.ValidateForm("equipment-group-form", true))
	{
		return;
	}

	if ($(".combobox-menu-visible").length)
	{
		return;
	}

	var jsonData = $('#equipment-group-form').serializeJSON();
	Grocy.FrontendHelpers.BeginUiBusy("equipment-group-form");

	if (Grocy.EditMode === 'create')
	{
		Grocy.Api.Post('objects/equipment_groups', jsonData,
			function(result)
			{
				Grocy.EditObjectId = result.created_object_id;
				Grocy.Components.UserfieldsForm.Save(function()
				{
					window.parent.postMessage(WindowMessageBag("CloseLastModal"), Grocy.BaseUrl);
				});
			},
			function(xhr)
			{
				Grocy.FrontendHelpers.EndUiBusy("equipment-group-form");
				Grocy.FrontendHelpers.ShowGenericError('Error while saving, probably this item already exists', xhr.response);
			}
		);
	}
	else
	{
		Grocy.Api.Put('objects/equipment_groups/' + Grocy.EditObjectId, jsonData,
			function(result)
			{
				Grocy.Components.UserfieldsForm.Save(function()
				{
					window.parent.postMessage(WindowMessageBag("CloseLastModal"), Grocy.BaseUrl);
				});
			},
			function(xhr)
			{
				Grocy.FrontendHelpers.EndUiBusy("equipment-group-form");
				Grocy.FrontendHelpers.ShowGenericError('Error while saving, probably this item already exists', xhr.response);
			}
		);
	}
});

$('#equipment-group-form input').keyup(function(event)
{
	Grocy.FrontendHelpers.ValidateForm('equipment-group-form');
});

$('#equipment-group-form input').keydown(function(event)
{
	if (event.keyCode === 13) // Enter
	{
		event.preventDefault();

		if (!Grocy.FrontendHelpers.ValidateForm('equipment-group-form'))
		{
			return false;
		}
		else
		{
			$('#save-equipment-group-button').click();
		}
	}
});

Grocy.Components.UserfieldsForm.Load();
setTimeout(function()
{
	$('#name').focus();
}, Grocy.FormFocusDelay);
Grocy.FrontendHelpers.ValidateForm('equipment-group-form');
