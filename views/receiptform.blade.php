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
			<button class="btn btn-success save-receipt-button">{{ $__t('Save') }}</button>
			@else
			<button class="btn btn-success save-receipt-button">{{ $__t('Save & close') }}</button>
			<button class="btn btn-primary save-receipt-button add-another">{{ $__t('Save & add another') }}</button>
			@endif
		</form>
	</div>
</div>
@stop
