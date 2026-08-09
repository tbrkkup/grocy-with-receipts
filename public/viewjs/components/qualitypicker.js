Grocy.Components.QualityPicker = {};

Grocy.Components.QualityPicker.GetPicker = function ()
{
	return $('#quality_ids');
}

// Always an array, also when nothing is picked
Grocy.Components.QualityPicker.GetValue = function ()
{
	return Grocy.Components.QualityPicker.GetPicker().val() || [];
}

Grocy.Components.QualityPicker.SetValue = function (qualityIds)
{
	Grocy.Components.QualityPicker.GetPicker().selectpicker('val', qualityIds || []);
}

Grocy.Components.QualityPicker.Clear = function ()
{
	Grocy.Components.QualityPicker.SetValue([]);
}

$(".quality-picker").selectpicker();
