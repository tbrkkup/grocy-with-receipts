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

		// Highlight the whole row of every selected checkbox (covers individual
		// clicks, "select all" and Reset, since they all funnel through here).
		$(tableSelector + ' .bulk-row-checkbox').each(function()
		{
			$(this).closest('tr').toggleClass('bulk-row-selected', $(this).prop('checked'));
		});

		LayoutToolbar();
	}

	// The toolbar is position:fixed (see grocy.css) so it stays visible while
	// scrolling. Because fixed elements are viewport-relative, set its left/width
	// to match the content column and reserve that height above the content so it
	// doesn't cover the top rows. Re-runs on show/hide and on window resize.
	function LayoutToolbar()
	{
		var toolbar = $(toolbarSelector);
		var parent = toolbar.parent();

		if (toolbar.hasClass('d-none'))
		{
			parent.css('padding-top', '');
			return;
		}

		var rect = parent[0].getBoundingClientRect();
		toolbar.css({ left: rect.left + 'px', width: rect.width + 'px' });
		parent.css('padding-top', toolbar.outerHeight() + 'px');
	}

	$(window).on('resize', LayoutToolbar);

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
