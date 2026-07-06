@php require_frontend_packages(['datatables']); @endphp

@extends('layout.default')

@section('title', $__t('Location overview'))

@section('content')
<div class="row">
	<div class="col">
		<h2 class="title">@yield('title')</h2>
	</div>
</div>

<hr class="my-2">

<div class="row">
	<div class="col">
		<table id="locationoverview-table"
			class="table table-sm table-striped nowrap w-100">
			<thead>
				<tr>
					<th>{{ $__t('Location') }}</th>
					<th class="text-right">{{ $__t('Products (directly here)') }}</th>
					<th class="text-right">{{ $__t('Products (incl. sub-locations)') }}</th>
				</tr>
			</thead>
			<tbody class="d-none">
				@foreach($rows as $row)
				<tr>
					<td>{!! str_repeat('&nbsp;&nbsp;&nbsp;', $row['level']) !!}{{ $row['name'] }}@if($row['is_freezer']) <i class="fa-solid fa-snowflake text-muted" data-toggle="tooltip" title="{{ $__t('Is freezer') }}"></i>@endif</td>
					<td class="text-right">{{ $row['products_direct'] }}</td>
					<td class="text-right">{{ $row['products_incl'] }}</td>
				</tr>
				@endforeach
			</tbody>
		</table>
	</div>
</div>
@stop
