var locationOverviewTable = $('#locationoverview-table').DataTable({
	'order': [], // serverseitige Pfad-Reihenfolge (Baum) beibehalten
	'paging': false,
	'columnDefs': [].concat($.fn.dataTable.defaults.columnDefs)
});
$('#locationoverview-table tbody').removeClass('d-none');
locationOverviewTable.columns.adjust().draw();
