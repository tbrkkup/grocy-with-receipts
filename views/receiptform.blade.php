@extends('layout.default')

@if($mode == 'edit')
@section('title', $__t('Edit receipt'))
@else
@section('title', $__t('Create receipt'))
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

			<div class="form-group">
				<label for="date">{{ $__t('Date') }}</label>
				<input type="date"
					class="form-control"
					id="date"
					name="date"
					value="@if($mode == 'edit'){{ $receipt->date }}@else{{ date('Y-m-d') }}@endif">
			</div>

			<div class="form-group">
				<label for="shopping_location_id">{{ $__t('Store') }}</label>
				<select class="custom-select"
					id="shopping_location_id"
					name="shopping_location_id">
					<option value="">{{ $__t('None') }}</option>
					@foreach($shoppinglocations as $shoppinglocation)
					<option value="{{ $shoppinglocation->id }}"
						@if($mode == 'edit' && $receipt->shopping_location_id == $shoppinglocation->id) selected @endif>
						{{ $shoppinglocation->name }}
					</option>
					@endforeach
				</select>
			</div>

			<div class="form-group">
				<label for="status">{{ $__t('Status') }}</label>
				<select class="custom-select"
					id="status"
					name="status">
					<option value="paid" @if($mode == 'create' || ($mode == 'edit' && $receipt->status == 'paid')) selected @endif>{{ $__t('Paid') }}</option>
					<option value="open" @if($mode == 'edit' && $receipt->status == 'open') selected @endif>{{ $__t('Open') }}</option>
					<option value="refunded" @if($mode == 'edit' && $receipt->status == 'refunded') selected @endif>{{ $__t('Refunded') }}</option>
				</select>
			</div>

			<div class="form-group">
				<label for="description">{{ $__t('Description') }}</label>
				<textarea class="form-control"
					rows="2"
					id="description"
					name="description">@if($mode == 'edit'){{ $receipt->description }}@endif</textarea>
			</div>

			<button id="save-receipt-button"
				class="btn btn-success">{{ $__t('Save') }}</button>

		</form>
	</div>
</div>

@if($mode == 'edit')
<div class="row mt-4">
	<div class="col-lg-8 col-12">
		<h4>{{ $__t('Files') }}</h4>
		<div id="receipt-files-list"
			class="mb-3">
			@forelse($receiptFiles as $file)
			<div class="d-flex align-items-center mb-1 receipt-file-row"
				data-file-name="{{ $file->file_name }}"
				data-file-id="{{ $file->id }}">
				<a href="{{ $U('/api/files/receipts/' . base64_encode($file->file_name)) }}"
					target="_blank"
					class="mr-2">
					<i class="fa-solid fa-file"></i> {{ $file->file_name }}
				</a>
				<a href="#"
					class="btn btn-sm btn-danger receipt-file-delete-button ml-2"
					data-file-id="{{ $file->id }}"
					data-file-name="{{ $file->file_name }}"
					data-toggle="tooltip"
					title="{{ $__t('Delete') }}">
					<i class="fa-solid fa-trash"></i>
				</a>
			</div>
			@empty
			<p class="text-muted">{{ $__t('No files attached') }}</p>
			@endforelse
		</div>

		<div class="form-group">
			<label for="receipt-file-upload">{{ $__t('Upload file') }}</label>
			<div class="input-group">
				<div class="custom-file">
					<input type="file"
						class="custom-file-input"
						id="receipt-file-upload"
						accept="image/*,.pdf">
					<label class="custom-file-label"
						for="receipt-file-upload">{{ $__t('Choose file') }}</label>
				</div>
				<div class="input-group-append">
					<button id="receipt-file-upload-button"
						class="btn btn-primary">{{ $__t('Upload') }}</button>
				</div>
			</div>
		</div>
	</div>
</div>

<div class="row mt-2">
	<div class="col-lg-10 col-12">
		<h4>{{ $__t('Linked purchases') }}</h4>
		@if(count($linkedPurchases) == 0)
		<p class="text-muted">{{ $__t('No purchases linked to this receipt') }}</p>
		@else
		<table class="table table-sm table-striped">
			<thead>
				<tr>
					<th>{{ $__t('Date') }}</th>
					<th>{{ $__t('Product') }}</th>
					<th>{{ $__t('Amount') }}</th>
					<th>{{ $__t('Price') }}</th>
				</tr>
			</thead>
			<tbody>
				@foreach($linkedPurchases as $purchase)
				<tr>
					<td>{{ $purchase->purchased_date }}</td>
					<td>{{ $purchase->product_id }}</td>
					<td>{{ $purchase->amount }}</td>
					<td>{{ $purchase->price }}</td>
				</tr>
				@endforeach
			</tbody>
		</table>
		@endif
	</div>
</div>
@endif
@stop
