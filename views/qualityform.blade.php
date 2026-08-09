@extends('layout.default')

@if($mode == 'edit')
@section('title', $__t('Edit quality'))
@else
@section('title', $__t('Create quality'))
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
			Grocy.EditObjectId = {{ $quality->id }};
		</script>
		@endif

		<form id="quality-form"
			novalidate>

			<div class="form-group">
				<label for="name">{{ $__t('Name') }}</label>
				<input type="text"
					class="form-control"
					required
					id="name"
					name="name"
					value="@if($mode == 'edit'){{ $quality->name }}@endif">
				<div class="invalid-feedback">{{ $__t('A name is required') }}</div>
			</div>

			<div class="form-group">
				<label for="parent_quality_id">{{ $__t('Parent quality') }}
					<i class="fa-solid fa-question-circle text-muted"
						data-toggle="tooltip"
						data-trigger="hover click"
						title="{{ $__t('Assigning this quality to a stock entry also implies its parents') }}"></i>
				</label>
				<select class="custom-control custom-select"
					id="parent_quality_id"
					name="parent_quality_id">
					<option value="">{{ $__t('None') }}</option>
					@foreach($parentOptions as $parentOption)
					@if(!in_array($parentOption->id, $excludedParentIds))
					<option value="{{ $parentOption->id }}"
						@if($mode == 'edit' && $quality->parent_quality_id == $parentOption->id) selected="selected" @endif>{!! str_repeat('&nbsp;&nbsp;&nbsp;', $parentOption->level) !!}{{ $parentOption->name }}</option>
					@endif
					@endforeach
				</select>
			</div>

			<div class="form-group">
				<div class="custom-control custom-checkbox">
					<input @if($mode=='create'
						)
						checked
						@elseif($mode=='edit'
						&&
						$quality->active == 1) checked @endif class="form-check-input custom-control-input" type="checkbox" id="active" name="active" value="1">
					<label class="form-check-label custom-control-label"
						for="active">{{ $__t('Active') }}</label>
				</div>
			</div>

			<div class="form-group">
				<label for="description">{{ $__t('Description') }}</label>
				<textarea class="form-control"
					rows="2"
					id="description"
					name="description">@if($mode == 'edit'){{ $quality->description }}@endif</textarea>
			</div>

			@include('components.userfieldsform', array(
			'userfields' => $userfields,
			'entity' => 'qualities'
			))

			<button id="save-quality-button"
				class="btn btn-success">{{ $__t('Save') }}</button>

		</form>
	</div>
</div>
@stop
