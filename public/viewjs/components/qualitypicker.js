Grocy.Components.QualityPicker = {};

Grocy.Components.QualityPicker.GetPicker = function ()
{
	return $('#quality_id');
}

Grocy.Components.QualityPicker.GetInputElement = function ()
{
	return $('#quality_id_text_input');
}

Grocy.Components.QualityPicker.GetValue = function ()
{
	return $('#quality_id').val();
}

Grocy.Components.QualityPicker.SetValue = function (value)
{
	Grocy.Components.QualityPicker.GetInputElement().val(value);
	Grocy.Components.QualityPicker.GetInputElement().trigger('change');
}

Grocy.Components.QualityPicker.SetId = function (value)
{
	Grocy.Components.QualityPicker.GetPicker().val(value);
	Grocy.Components.QualityPicker.GetPicker().data('combobox').refresh();
	Grocy.Components.QualityPicker.GetInputElement().trigger('change');
}

Grocy.Components.QualityPicker.Clear = function ()
{
	Grocy.Components.QualityPicker.SetValue('');
	Grocy.Components.QualityPicker.SetId(null);
}

$(".quality-combobox").combobox(BootstrapComboboxDefaults);

var qualityPickerPrefillById = Grocy.Components.QualityPicker.GetPicker().parent().data('prefill-by-id').toString();
if (qualityPickerPrefillById)
{
	Grocy.Components.QualityPicker.SetId(qualityPickerPrefillById);

	var nextInputElement = $(Grocy.Components.QualityPicker.GetPicker().parent().data('next-input-selector').toString());
	nextInputElement.focus();
}
