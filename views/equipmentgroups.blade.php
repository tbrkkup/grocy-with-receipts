@php require_frontend_packages(['datatables']); @endphp

@extends('layout.default')

@section('title', $__t('Equipment groups'))

@section('content')
<div class="row d-none"
	id="bulk-edit-toolbar">
	<div class="col">
		<div class="alert alert-secondary d-flex align-items-center flex-wrap">
			<span class="mr-3"><strong id="bulk-edit-selected-count">0</strong> {{ $__t('selected') }}</span>
			<button class="btn btn-sm btn-outline-danger mt-1 mb-1"
				id="bulk-edit-delete-button">{{ $__t('Delete') }}</button>
		</div>
	</div>
</div>

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
				<button class="btn btn-outline-dark d-md-none mt-2 order-1 order-md-3"
					type="button"
					data-toggle="collapse"
					data-target="#related-links">
					<i class="fa-solid fa-ellipsis-v"></i>
				</button>
			</div>
			<div class="related-links collapse d-md-flex order-2 width-xs-sm-100"
				id="related-links">
				<a class="btn btn-primary responsive-button show-as-dialog-link m-1 mt-md-0 mb-md-0 float-right"
					href="{{ $U('/equipmentgroup/new?embedded') }}">
					{{ $__t('Add') }}
				</a>
				<a class="btn btn-outline-secondary m-1 mt-md-0 mb-md-0 float-right"
					href="{{ $U('/userfields?entity=equipment_groups') }}">
					{{ $__t('Configure userfields') }}
				</a>
			</div>
		</div>
	</div>
</div>

<hr class="my-2">

<div class="row collapse d-md-flex"
	id="table-filter-row">
	<div class="col-12 col-md-6 col-xl-3">
		<div class="input-group mb-3">
			<div class="input-group-prepend">
				<span class="input-group-text"><i class="fa-solid fa-search"></i></span>
			</div>
			<input type="text"
				id="search"
				class="form-control"
				placeholder="{{ $__t('Search') }}">
		</div>
	</div>
	<div class="col-12 col-md-6 col-xl-3">
		<div class="form-check custom-control custom-checkbox">
			<input class="form-check-input custom-control-input"
				type="checkbox"
				id="show-disabled">
			<label class="form-check-label custom-control-label"
				for="show-disabled">
				{{ $__t('Show disabled') }}
			</label>
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
		<table id="equipmentgroups-table"
			class="table table-sm table-striped nowrap w-100">
			<thead>
				<tr>
					<th class="fit-content">
						<input type="checkbox"
							class="bulk-select-all">
					</th>
					<th class="border-right"><a class="text-muted change-table-columns-visibility-button"
							data-toggle="tooltip"
							title="{{ $__t('Table options') }}"
							data-table-selector="#equipmentgroups-table"
							href="#"><i class="fa-solid fa-eye"></i></a>
					</th>
					<th>{{ $__t('Name') }}</th>
					<th>{{ $__t('Description') }}</th>
					<th>{{ $__t('Equipment count') }}</th>

					@include('components.userfields_thead', array(
					'userfields' => $userfields
					))
				</tr>
			</thead>
			<tbody class="d-none">
				@foreach($equipmentGroups as $equipmentGroup)
				<tr class="@if($equipmentGroup->active == 0) text-muted @endif">
					<td class="fit-content">
						<input type="checkbox"
							class="bulk-row-checkbox"
							data-object-id="{{ $equipmentGroup->id }}">
					</td>
					<td class="fit-content border-right">
						<a class="btn btn-info btn-sm show-as-dialog-link"
							href="{{ $U('/equipmentgroup/') }}{{ $equipmentGroup->id }}?embedded"
							data-toggle="tooltip"
							title="{{ $__t('Edit this item') }}">
							<i class="fa-solid fa-edit"></i>
						</a>
						<a class="btn btn-danger btn-sm equipment-group-delete-button"
							href="#"
							data-group-id="{{ $equipmentGroup->id }}"
							data-group-name="{{ $equipmentGroup->name }}"
							data-toggle="tooltip"
							title="{{ $__t('Delete this item') }}">
							<i class="fa-solid fa-trash"></i>
						</a>
					</td>
					<td>
						{{ $equipmentGroup->name }}
					</td>
					<td>
						{{ $equipmentGroup->description }}
					</td>
					<td>
						{{ count(FindAllObjectsInArrayByPropertyValue($equipment, 'equipment_group_id', $equipmentGroup->id)) }}
					</td>

					@include('components.userfields_tbody', array(
					'userfields' => $userfields,
					'userfieldValues' => FindAllObjectsInArrayByPropertyValue($userfieldValues, 'object_id', $equipmentGroup->id)
					))

				</tr>
				@endforeach
			</tbody>
		</table>
	</div>
</div>
@include('components.bulkselect')
@stop
