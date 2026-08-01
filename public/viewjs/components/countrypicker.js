Grocy.Components.CountryPicker = {};

Grocy.Components.CountryPicker.GetPicker = function ()
{
	return $('#origin_country_id');
}

Grocy.Components.CountryPicker.GetInputElement = function ()
{
	return $('#origin_country_id_text_input');
}

Grocy.Components.CountryPicker.GetValue = function ()
{
	return $('#origin_country_id').val();
}

Grocy.Components.CountryPicker.SetValue = function (value)
{
	Grocy.Components.CountryPicker.GetInputElement().val(value);
	Grocy.Components.CountryPicker.GetInputElement().trigger('change');
}

Grocy.Components.CountryPicker.SetId = function (value)
{
	Grocy.Components.CountryPicker.GetPicker().val(value);
	Grocy.Components.CountryPicker.GetPicker().data('combobox').refresh();
	Grocy.Components.CountryPicker.GetInputElement().trigger('change');
}

Grocy.Components.CountryPicker.Clear = function ()
{
	Grocy.Components.CountryPicker.SetValue('');
	Grocy.Components.CountryPicker.SetId(null);
}

$(".country-combobox").combobox(BootstrapComboboxDefaults);

var countryPickerPrefillById = Grocy.Components.CountryPicker.GetPicker().parent().data('prefill-by-id').toString();
if (countryPickerPrefillById)
{
	Grocy.Components.CountryPicker.SetId(countryPickerPrefillById);

	var nextInputElement = $(Grocy.Components.CountryPicker.GetPicker().parent().data('next-input-selector').toString());
	nextInputElement.focus();
}
