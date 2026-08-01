@php require_frontend_packages(['datatables']); @endphp

@extends('layout.default')

@section('title', $__t('Receipts'))

@section('content')
<div class="row">
	<div class="col">
		<div class="title-related-links">
			<h2 class="title">@yield('title')</h2>
			<div class="float-right @if($embedded) pr-5 @endif">
				<button class="btn btn-outline-dark d-md-none mt-2 order-1 order-md-3"
					type="button"
					data-toggle="collapse"
					data-target="#table-filter-row">
					<i class="fa-solid fa-filter"></i>
				</button>
			</div>
			<div class="related-links collapse d-md-flex order-2 width-xs-sm-100"
				id="related-links">
				<a class="btn btn-primary responsive-button m-1 mt-md-0 mb-md-0 float-right show-as-dialog-link"
					href="{{ $U('/receipt/new?embedded') }}">
					{{ $__t('Add') }}
				</a>
			</div>
		</div>
	</div>
</div>

<hr class="my-2">

<div class="row collapse d-md-flex"
	id="table-filter-row">
	<div class="col-12 col-md-6 col-xl-3">
		<div class="input-group">
			<div class="input-group-prepend">
				<span class="input-group-text"><i class="fa-solid fa-search"></i></span>
			</div>
			<input type="text"
				id="search"
				class="form-control"
				placeholder="{{ $__t('Search') }}">
		</div>
	</div>
	<div class="col-12 col-md-4 col-xl-2">
		<select id="status-filter"
			class="custom-select">
			<option value="">{{ $__t('All statuses') }}</option>
			<option value="paid">{{ $__t('Paid') }}</option>
			<option value="open">{{ $__t('Open') }}</option>
			<option value="refunded">{{ $__t('Refunded') }}</option>
		</select>
	</div>
	<div class="col">
		<div class="float-right">
			<button id="clear-filter-button"
				class="btn btn-sm btn-outline-info"
				data-toggle="tooltip"
				title="{{ $__t('Clear filter') }}">
				<i class="fa-solid fa-filter-circle-xmark"></i>
			</button>
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
					<th>{{ $__t('Store') }}</th>
					<th>{{ $__t('Status') }}</th>
					<th>{{ $__t('Description') }}</th>
				</tr>
			</thead>
			<tbody class="d-none">
				@php
				$shoppinglocationsById = [];
				foreach($shoppinglocations as $loc)
				{
					$shoppinglocationsById[$loc->id] = $loc->name;
				}
				@endphp
				@foreach($receipts as $receipt)
				<tr>
					<td class="fit-content border-right">
						<a class="btn btn-info btn-sm show-as-dialog-link"
							href="{{ $U('/receipt/') }}{{ $receipt->id }}?embedded"
							data-toggle="tooltip"
							title="{{ $__t('Edit this item') }}">
							<i class="fa-solid fa-edit"></i>
						</a>
						<a class="btn btn-danger btn-sm receipt-delete-button"
							href="#"
							data-receipt-id="{{ $receipt->id }}"
							data-toggle="tooltip"
							title="{{ $__t('Delete this item') }}">
							<i class="fa-solid fa-trash"></i>
						</a>
					</td>
					<td>{{ $receipt->date }}</td>
					<td>
						@if($receipt->shopping_location_id && isset($shoppinglocationsById[$receipt->shopping_location_id]))
							{{ $shoppinglocationsById[$receipt->shopping_location_id] }}
						@endif
					</td>
					<td>
						@if($receipt->status == 'paid')
							<span class="badge badge-success">{{ $__t('Paid') }}</span>
						@elseif($receipt->status == 'open')
							<span class="badge badge-warning">{{ $__t('Open') }}</span>
						@elseif($receipt->status == 'refunded')
							<span class="badge badge-secondary">{{ $__t('Refunded') }}</span>
						@else
							{{ $receipt->status }}
						@endif
					</td>
					<td>{{ $receipt->description }}</td>
				</tr>
				@endforeach
			</tbody>
		</table>
	</div>
</div>
@stop
