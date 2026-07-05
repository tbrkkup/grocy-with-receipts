@php require_frontend_packages(['datatables']); @endphp

@extends('layout.default')

@section('title', $__t('Receipts'))

@section('content')
<script>
	Grocy.ReceiptFilesByReceiptId = {!! json_encode(array_map(function($files) use ($U) {
		return array_map(function($file) use ($U) {
			return [
				'fileName' => $file->file_name,
				'url' => $U('/api/files/receipts/' . base64_encode($file->file_name)),
			];
		}, $files);
	}, $receiptFilesByReceiptId)) !!};
</script>

<div class="row">
	<div class="col">
		<div class="title-related-links">
			<h2 class="title">@yield('title')</h2>
			<button class="btn btn-outline-dark d-md-none mt-2 float-right order-1 order-md-3"
				type="button"
				data-toggle="collapse"
				data-target="#related-links">
				<i class="fa-solid fa-ellipsis-v"></i>
			</button>
			<div class="related-links collapse d-md-flex order-2 width-xs-sm-100 m-1 mt-md-0 mb-md-0 float-right"
				id="related-links">
				<a class="btn btn-primary responsive-button show-as-dialog-link"
					href="{{ $U('/receipt/new?embedded') }}">
					{{ $__t('Add') }}
				</a>
			</div>
		</div>
	</div>
</div>

<div class="row">
	<div class="col">
		<table id="receipts-table"
			class="table table-sm table-striped nowrap w-100">
			<thead>
				<tr>
					<th class="border-right"><a class="text-muted change-table-columns-visibility-button"
							data-toggle="tooltip"
							title="{{ $__t('Table options') }}"
							data-table-selector="#receipts-table"
							href="#"><i class="fa-solid fa-eye"></i></a>
					</th>
					<th>{{ $__t('Date') }}</th>
					<th>{{ $__t('Invoice number') }}</th>
					<th>{{ $__t('Store') }}</th>
					<th>{{ $__t('Status') }}</th>
					<th>{{ $__t('Description') }}</th>
				</tr>
			</thead>
			<tbody class="d-none">
				@foreach($receipts as $receipt)
					<tr id="receipt-{{ $receipt->id }}-row">
						<td class="fit-content border-right">
							@if(!empty($receiptFilesByReceiptId[$receipt->id]))
							<a class="btn btn-sm btn-secondary show-receipt-files-preview-button"
								href="#"
								data-receipt-id="{{ $receipt->id }}"
								data-toggle="tooltip"
								title="{{ $__t('View attached files') }}">
								<i class="fa-solid fa-paperclip"></i>
							</a>
							@endif
							<a class="btn btn-info btn-sm show-as-dialog-link"
								href="{{ $U('/receipt/') }}{{ $receipt->id }}?embedded"
								data-toggle="tooltip"
								title="{{ $__t('Edit this item') }}">
								<i class="fa-solid fa-edit"></i>
							</a>
							<a class="btn btn-sm btn-danger delete-receipt-button"
								href="#"
								data-receipt-id="{{ $receipt->id }}"
								data-toggle="tooltip"
								title="{{ $__t('Delete this item') }}">
								<i class="fa-solid fa-trash"></i>
							</a>
						</td>
						<td>{{ $receipt->date }}</td>
						<td>{{ $receipt->invoice_number }}</td>
						<td>
							@if($receipt->shopping_location_id != null)
								{{ FindObjectInArrayByPropertyValue($shoppingLocations, 'id', $receipt->shopping_location_id)->name }}
							@endif
						</td>
						<td>{{ $receipt->status }}</td>
						<td>{{ $receipt->description }}</td>
					</tr>
				@endforeach
			</tbody>
		</table>
	</div>
</div>

<div class="modal fade" id="receipt-files-preview-modal" tabindex="-1" role="dialog">
	<div class="modal-dialog modal-lg modal-dialog-centered" role="document">
		<div class="modal-content">
			<div class="modal-header">
				<h5 class="modal-title" id="receipt-files-preview-modal-filename"></h5>
				<button type="button" class="close" data-dismiss="modal" aria-label="Close">
					<span aria-hidden="true">&times;</span>
				</button>
			</div>
			<div class="modal-body d-flex align-items-center justify-content-center">
				<button type="button" class="btn btn-light receipt-files-preview-prev-button" aria-label="Previous">
					<i class="fa-solid fa-chevron-left"></i>
				</button>
				<div class="receipt-files-preview-content text-center w-100">
					<img id="receipt-files-preview-image" class="img-fluid d-none" src="" alt="">
					<embed id="receipt-files-preview-pdf" class="d-none w-100" type="application/pdf" src="" style="height: 75vh;">
				</div>
				<button type="button" class="btn btn-light receipt-files-preview-next-button" aria-label="Next">
					<i class="fa-solid fa-chevron-right"></i>
				</button>
			</div>
		</div>
	</div>
</div>
@stop
