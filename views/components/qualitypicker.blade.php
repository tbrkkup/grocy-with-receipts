@php require_frontend_packages(['bootstrap-combobox']); @endphp

@once
@push('componentScripts')
<script src="{{ $U('/viewjs/components/qualitypicker.js', true) }}?v={{ $version }}"></script>
@endpush
@endonce

@php if(empty($label)) { $label = 'Quality'; } @endphp
@php if(empty($prefillById)) { $prefillById = ''; } @endphp
@php if(!isset($isRequired)) { $isRequired = false; } @endphp
@php if(empty($hint)) { $hint = ''; } @endphp
@php if(empty($nextInputSelector)) { $nextInputSelector = ''; } @endphp

<div class="form-group"
	data-next-input-selector="{{ $nextInputSelector }}"
	data-prefill-by-id="{{ $prefillById }}">
	<label for="quality_id">{{ $__t($label) }}
		@if(!empty($hint))
		<i class="fa-solid fa-question-circle text-muted"
			data-toggle="tooltip"
			data-trigger="hover click"
			title="{{ $hint }}"></i>
		@endif
	</label>
	<select class="form-control quality-combobox"
		id="quality_id"
		name="quality_id"
		@if($isRequired)
		required
		@endif>
		<option value=""></option>
		@foreach($qualities as $quality)
		<option value="{{ $quality->id }}">{{ $quality->name }}</option>
		@endforeach
	</select>
	<div class="invalid-feedback">{{ $__t('You have to select a quality') }}</div>
</div>
