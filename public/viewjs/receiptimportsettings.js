$('#save-receipt-import-settings').on('click', function(e)
{
	e.preventDefault();
	var btn = $(this);
	btn.prop('disabled', true);

	var payload = {
		anthropic_model: $('#anthropic_model').val(),
		receipt_digital_backend: $('#receipt_digital_backend').val()
	};
	var key = $('#anthropic_api_key').val();
	if (key && key.trim() !== '')
	{
		payload.anthropic_api_key = key.trim();
	}

	Grocy.Api.Post('receipts/settings', payload,
		function()
		{
			$('#receipt-import-settings-status').html('<div class="alert alert-success mb-0">' + __t('Settings saved') + '</div>');
			$('#anthropic_api_key').val('');
			btn.prop('disabled', false);
		},
		function(xhr)
		{
			var msg = (xhr && xhr.response) ? xhr.response : 'Error';
			$('#receipt-import-settings-status').html('<div class="alert alert-danger mb-0">' + msg + '</div>');
			btn.prop('disabled', false);
		}
	);
});
