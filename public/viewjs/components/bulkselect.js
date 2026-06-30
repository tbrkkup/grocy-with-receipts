Grocy.Components.BulkSelect = function(options)
{
	var tableSelector = options.tableSelector;
	var toolbarSelector = options.toolbarSelector;
	var countSelector = options.countSelector;

	function UpdateToolbar()
	{
		var count = $(tableSelector + ' .bulk-row-checkbox:checked').length;

		if (count > 0)
		{
			$(toolbarSelector).removeClass('d-none');
		}
		else
		{
			$(toolbarSelector).addClass('d-none');
		}

		if (countSelector)
		{
			$(countSelector).text(count);
		}

		var total = $(tableSelector + ' .bulk-row-checkbox:visible').length;
		var checkedVisible = $(tableSelector + ' .bulk-row-checkbox:visible:checked').length;
		$(tableSelector + ' .bulk-select-all').prop('checked', total > 0 && checkedVisible === total);
	}

	$(document).on('change', tableSelector + ' .bulk-row-checkbox', UpdateToolbar);

	$(document).on('change', tableSelector + ' .bulk-select-all', function()
	{
		var checked = $(this).prop('checked');
		$(tableSelector + ' .bulk-row-checkbox:visible').prop('checked', checked);
		UpdateToolbar();
	});

	this.GetSelectedIds = function()
	{
		var ids = [];
		$(tableSelector + ' .bulk-row-checkbox:checked').each(function()
		{
			ids.push(parseInt($(this).attr('data-object-id')));
		});
		return ids;
	};

	this.Reset = function()
	{
		$(tableSelector + ' .bulk-row-checkbox').prop('checked', false);
		$(tableSelector + ' .bulk-select-all').prop('checked', false);
		UpdateToolbar();
	};

	UpdateToolbar();
};
