@php require_frontend_packages(['bootstrap-combobox']); @endphp

@once
@push('componentScripts')
<script src="{{ $U('/viewjs/components/countrypicker.js', true) }}?v={{ $version }}"></script>
@endpush
@endonce

@php if(empty($label)) { $label = 'Origin country'; } @endphp
@php if(empty($prefillById)) { $prefillById = ''; } @endphp
@php if(!isset($isRequired)) { $isRequired = false; } @endphp
@php if(empty($hint)) { $hint = ''; } @endphp
@php if(empty($nextInputSelector)) { $nextInputSelector = ''; } @endphp

<div class="form-group"
	data-next-input-selector="{{ $nextInputSelector }}"
	data-prefill-by-id="{{ $prefillById }}">
	<label for="origin_country_id">{{ $__t($label) }}
		@if(!empty($hint))
		<i class="fa-solid fa-question-circle text-muted"
			data-toggle="tooltip"
			data-trigger="hover click"
			title="{{ $hint }}"></i>
		@endif
	</label>
	<select class="form-control country-combobox"
		id="origin_country_id"
		name="origin_country_id"
		@if($isRequired)
		required
		@endif>
		<option value=""></option>
		@foreach($countries as $country)
		<option value="{{ $country->id }}">{{ $country->name }}</option>
		@endforeach
	</select>
	<div class="invalid-feedback">{{ $__t('You have to select a country') }}</div>
</div>
