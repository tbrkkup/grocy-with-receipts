@php require_frontend_packages(['datatables']); @endphp

@extends('layout.default')

@section('title', $__t('Receipt aliases'))

@section('content')
<div class="row">
	<div class="col">
		<div class="title-related-links">
			<h2 class="title">@yield('title')</h2>
		</div>
	</div>
</div>

<hr class="my-2">

<div class="row">
	<div class="col">
		<div class="alert alert-info">
			{{ $__t('Receipt aliases map the (often cryptic) text printed on a store receipt to one of your Grocy products, per store. They are learned automatically when you import scanned/photographed receipts, so the next import can pre-fill the matching.') }}
		</div>
	</div>
</div>

<div class="row">
	<div class="col-12 col-md-6 col-xl-4">
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
		@if(count($aliases) == 0)
		<p class="text-muted font-italic mt-3">{{ $__t('No receipt aliases have been learned yet') }}</p>
		@else
		<table id="receiptaliases-table"
			class="table table-sm table-striped nowrap w-100">
			<thead>
				<tr>
					<th class="fit-content border-right"></th>
					<th>{{ $__t('Product') }}</th>
					<th>{{ $__t('Store') }}</th>
					<th>{{ $__t('Receipt text') }}</th>
					<th>{{ $__t('Origin country') }}</th>
					<th>{{ $__t('Qualities') }}</th>
					<th>{{ $__t('Times confirmed') }}</th>
					<th>{{ $__t('Last used') }}</th>
				</tr>
			</thead>
			<tbody class="d-none">
				@foreach($aliases as $alias)
				@php
				$aliasProduct = FindObjectInArrayByPropertyValue($products, 'id', $alias->product_id);
				$aliasShop = $alias->shopping_location_id !== null ? FindObjectInArrayByPropertyValue($shoppingLocations, 'id', $alias->shopping_location_id) : null;
				@endphp
				<tr>
					<td class="fit-content border-right">
						<a class="btn btn-danger btn-sm receiptalias-delete-button"
							href="#"
							data-receiptalias-id="{{ $alias->id }}"
							data-receiptalias-text="{{ $alias->alias }}"
							data-toggle="tooltip"
							title="{{ $__t('Delete this item') }}">
							<i class="fa-solid fa-trash"></i>
						</a>
					</td>
					<td>@if($aliasProduct !== null){{ $aliasProduct->name }}@else<span class="text-muted">#{{ $alias->product_id }}</span>@endif</td>
					<td>@if($aliasShop !== null){{ $aliasShop->name }}@else<span class="text-muted font-italic">{{ $__t('Any store') }}</span>@endif</td>
					<td>{{ $alias->alias }}</td>
					<td>{{ $countryNamesById[$alias->origin_country_id] ?? '' }}</td>
					<td>{{ $qualityLabelsByAliasId[$alias->id] ?? '' }}</td>
					<td>{{ $alias->times_confirmed }}</td>
					<td>@if(!empty($alias->last_used_timestamp)){{ $alias->last_used_timestamp }}@else<span class="text-muted">–</span>@endif</td>
				</tr>
				@endforeach
			</tbody>
		</table>
		@endif
	</div>
</div>
@stop
