@php require_frontend_packages(['tempusdominus']); @endphp

@extends('layout.default')

@if($mode == 'edit')
@section('title', $__t('Edit receipt'))
@else
@section('title', $__t('Add receipt'))
@endif

@section('content')
<div class="row">
	<div class="col">
		<h2 class="title">@yield('title')</h2>
	</div>
</div>

<hr class="my-2">

<div class="row">
	<div class="col-lg-6 col-12">
		<script>
			Grocy.EditMode = '{{ $mode }}';
		</script>

		@if($mode == 'edit')
		<script>
			Grocy.EditObjectId = {{ $receipt->id }};
		</script>
		@endif

		<form id="receipt-form"
			novalidate>

			@php
			$initialDate = null;
			if ($mode == 'edit' && !empty($receipt->date))
			{
				$initialDate = $receipt->date;
			}
			@endphp
			@include('components.datetimepicker', array(
				'id' => 'date',
				'label' => 'Date',
				'format' => 'YYYY-MM-DD',
				'initWithNow' => false,
				'initialValue' => $initialDate,
				'limitEndToNow' => false,
				'limitStartToNow' => false,
				'invalidFeedback' => '',
				'nextInputSelector' => 'shopping_location_id',
				'additionalGroupCssClasses' => 'date-only-datetimepicker',
				'isRequired' => false
			))

			<div class="form-group">
				<label for="shopping_location_id">{{ $__t('Store') }}</label>
				<select class="custom-control custom-select"
					id="shopping_location_id"
					name="shopping_location_id">
					<option value=""></option>
					@foreach($shoppingLocations as $shoppingLocation)
					<option @if($mode == 'edit' && $shoppingLocation->id == $receipt->shopping_location_id) selected="selected" @endif
						value="{{ $shoppingLocation->id }}">{{ $shoppingLocation->name }}</option>
					@endforeach
				</select>
			</div>

			<div class="form-group">
				<label for="status">{{ $__t('Status') }}</label>
				<select class="custom-control custom-select"
					id="status"
					name="status">
					<option value="paid" @if($mode == 'edit' && $receipt->status == 'paid') selected="selected" @elseif($mode == 'create') selected="selected" @endif>{{ $__t('Paid') }}</option>
					<option value="open" @if($mode == 'edit' && $receipt->status == 'open') selected="selected" @endif>{{ $__t('Open') }}</option>
					<option value="refunded" @if($mode == 'edit' && $receipt->status == 'refunded') selected="selected" @endif>{{ $__t('Refunded') }}</option>
				</select>
			</div>

			<div class="form-group">
				<label for="description">{{ $__t('Description') }}</label>
				<textarea class="form-control"
					rows="3"
					id="description"
					name="description">@if($mode == 'edit'){{ $receipt->description }}@endif</textarea>
			</div>

			@if($mode == 'edit')
			<div class="form-group">
				<label>{{ $__t('Files') }}</label>
				<ul class="list-group mb-2 @if(empty($receiptFiles)) d-none @endif" id="receipt-files-list">
					@foreach($receiptFiles as $receiptFile)
					<li class="list-group-item d-flex justify-content-between align-items-center">
						<a href="{{ $U('/api/files/receipts/' . base64_encode($receiptFile->file_name)) }}" target="_blank">{{ $receiptFile->file_name }}</a>
						<button class="btn btn-sm btn-danger delete-receipt-file-button"
							data-receipt-file-id="{{ $receiptFile->id }}"
							data-file-name="{{ $receiptFile->file_name }}">
							<i class="fa-solid fa-fw fa-trash"></i>
						</button>
					</li>
					@endforeach
				</ul>
			</div>
			@endif

			<div class="form-group">
				<label for="receipt-file">{{ $__t('Add file') }}</label>
				<div class="custom-file">
					<input type="file"
						class="custom-file-input"
						id="receipt-file"
						accept="application/pdf,image/*"
						multiple>
					<label id="receipt-file-label"
						class="custom-file-label"
						for="receipt-file">
						{{ $__t('No file selected') }}
					</label>
				</div>
				<small class="form-text text-muted">{{ $__t('You can attach one or more files (e.g. PDF or images). They will be uploaded when you save.') }}</small>
			</div>

			@if($mode == 'edit')
			<button class="btn btn-success save-receipt-button">{{ $__t('Save & close') }}</button>
			@else
			<button class="btn btn-success save-receipt-button">{{ $__t('Save & close') }}</button>
			<button class="btn btn-primary save-receipt-button add-another">{{ $__t('Save & add another') }}</button>
			@endif
		</form>
	</div>

	@if($mode == 'edit')
	<div class="col-lg-6 col-12">
		<div class="title-related-links mb-3">
			<h4>{{ $__t('Equipment') }}</h4>
		</div>
		<ul class="list-group @if(empty($linkedEquipment)) d-none @endif"
			id="linked-equipment-list">
			@foreach($linkedEquipment as $equipmentItem)
			<li class="list-group-item d-flex justify-content-between align-items-center">
				<a href="{{ $U('/equipment/') }}{{ $equipmentItem->id }}">{{ $equipmentItem->name }}</a>
			</li>
			@endforeach
		</ul>
		<p class="text-muted font-italic @if(!empty($linkedEquipment)) d-none @endif"
			id="no-linked-equipment-hint">{{ $__t('No equipment is associated with this receipt') }}</p>
	</div>
	@endif
</div>
@stop
