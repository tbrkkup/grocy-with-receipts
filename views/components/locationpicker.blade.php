@php require_frontend_packages(['bootstrap-combobox']); @endphp

@once
@push('componentScripts')
<script src="{{ $U('/viewjs/components/locationpicker.js', true) }}?v={{ $version }}"></script>
@endpush
@endonce

@php if(empty($prefillByName)) { $prefillByName = ''; } @endphp
@php if(empty($prefillById)) { $prefillById = ''; } @endphp
@php if(!isset($isRequired)) { $isRequired = true; } @endphp
@php if(empty($hint)) { $hint = ''; } @endphp
@php if(empty($nextInputSelector)) { $nextInputSelector = ''; } @endphp
@php if(!isset($createNew)) { $createNew = false; } @endphp

<div class="form-group"
	data-next-input-selector="{{ $nextInputSelector }}"
	data-prefill-by-name="{{ $prefillByName }}"
	data-prefill-by-id="{{ $prefillById }}">
	<label for="location_id">{{ $__t('Location') }}
		@if(!empty($hint))
		<i class="fa-solid fa-question-circle text-muted"
			data-toggle="tooltip"
			data-trigger="hover click"
			title="{{ $hint }}"></i>
		@endif
	</label>
	<div class="input-group">
		<select class="form-control location-combobox"
			id="location_id"
			name="location_id"
			@if($createNew)
			data-createnew-entity="locations"
			@endif
			@if($isRequired)
			required
			@endif>
			<option value=""></option>
			@foreach(SortLocationsAsTree($locations) as $locationTreeItem)
			<option value="{{ $locationTreeItem['id'] }}">{{ $locationTreeItem['path'] }}</option>
			@endforeach
		</select>
		@if($createNew)
		<div class="input-group-append">
			<button class="btn btn-outline-secondary create-new-picker-button"
				type="button"
				data-newform-url="/location/new"
				data-target-select="location_id"
				title="{{ $__t('Create new') }}"><i class="fa-solid fa-plus"></i></button>
		</div>
		@endif
		<div class="invalid-feedback">{{ $__t('You have to select a location') }}</div>
	</div>
</div>
