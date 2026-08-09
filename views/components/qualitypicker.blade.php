@php require_frontend_packages(['bootstrap-select']); @endphp

@once
@push('componentScripts')
<script src="{{ $U('/viewjs/components/qualitypicker.js', true) }}?v={{ $version }}"></script>
@endpush
@endonce

@php if(empty($label)) { $label = 'Qualities'; } @endphp
@php if(!isset($prefillByIds) || !is_array($prefillByIds)) { $prefillByIds = []; } @endphp
@php if(empty($hint)) { $hint = ''; } @endphp

<div class="form-group">
	<label for="quality_ids">{{ $__t($label) }}
		@if(!empty($hint))
		<i class="fa-solid fa-question-circle text-muted"
			data-toggle="tooltip"
			data-trigger="hover click"
			title="{{ $hint }}"></i>
		@endif
	</label>
	<select class="form-control selectpicker quality-picker"
		id="quality_ids"
		name="quality_ids[]"
		multiple
		data-actions-box="true"
		data-live-search="true"
		data-selected-text-format="count > 2"
		title="{{ $__t('None') }}">
		@foreach($qualities as $quality)
		<option value="{{ $quality->id }}"
			@if(in_array($quality->id, $prefillByIds)) selected="selected" @endif>{!! str_repeat('&nbsp;&nbsp;&nbsp;', $quality->level ?? 0) !!}{{ $quality->name }}</option>
		@endforeach
	</select>
	<div class="form-text text-muted small">{{ $__t('Picking a quality also implies its parents') }}</div>
</div>
