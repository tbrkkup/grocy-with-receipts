Grocy.Components.BulkSelect = function(options)
{
	var tableSelector = options.tableSelector;
	var toolbarSelector = options.toolbarSelector;
	var countSelector = options.countSelector;
	var rangeAnchorIndex = null;

	// grocy's DataTables use scrollX, which clones the table header (incl. the
	// "select all" checkbox) into a .dataTables_scrollHead that lives OUTSIDE
	// #table. So target the select-all in the whole DataTables wrapper (original
	// + clone), and treat a change on either as belonging to this table.
	function SelectAllCheckboxes()
	{
		var wrapper = $(tableSelector).closest('.dataTables_wrapper');
		return wrapper.length ? wrapper.find('.bulk-select-all') : $(tableSelector + ' .bulk-select-all');
	}

	function BelongsToThisTable(el)
	{
		var $el = $(el);
		return $el.closest(tableSelector).length > 0 || $el.closest('.dataTables_wrapper').find(tableSelector).length > 0;
	}

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
		SelectAllCheckboxes().prop('checked', total > 0 && checkedVisible === total);

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

	// Delegated on any .bulk-select-all (not scoped to #table) so the cloned
	// scroll-header checkbox is caught too; BelongsToThisTable filters to ours.
	$(document).on('change', '.bulk-select-all', function()
	{
		if (!BelongsToThisTable(this))
		{
			return;
		}

		var checked = $(this).prop('checked');
		$(tableSelector + ' .bulk-row-checkbox:visible').prop('checked', checked);
		UpdateToolbar();
	});

	// Shift-click range selection (like Windows Explorer): a plain click sets the
	// anchor, a shift-click additionally selects every row between the anchor and
	// the clicked row (in the current display order).
	$(document).on('click', tableSelector + ' .bulk-row-checkbox', function(e)
	{
		var checkboxes = $(tableSelector + ' .bulk-row-checkbox');
		var index = checkboxes.index(this);

		if (e.shiftKey && rangeAnchorIndex !== null && rangeAnchorIndex !== index)
		{
			var start = Math.min(rangeAnchorIndex, index);
			var end = Math.max(rangeAnchorIndex, index);
			checkboxes.slice(start, end + 1).prop('checked', true);
			UpdateToolbar();
		}
		else
		{
			rangeAnchorIndex = index;
		}
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
		SelectAllCheckboxes().prop('checked', false);
		rangeAnchorIndex = null;
		UpdateToolbar();
	};

	UpdateToolbar();
};
