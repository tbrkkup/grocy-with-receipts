@extends('layout.default')

@section('title', $__t('Receipt import settings'))

@section('content')
<div class="row">
	<div class="col">
		<h2 class="title">@yield('title')</h2>
	</div>
</div>

<hr class="my-2">

<div class="row">
	<div class="col-lg-6 col-12">
		<div class="alert alert-info">
			{{ $__t('The Anthropic API key is stored on the server (not in the browser) and is used to analyze receipts for the bulk purchase. It is required for scanned/photographed receipts.') }}
		</div>

		<form id="receipt-import-settings-form"
			novalidate>

			<div class="form-group">
				<label for="anthropic_api_key">{{ $__t('Anthropic API key') }}</label>
				<input type="password"
					class="form-control"
					id="anthropic_api_key"
					name="anthropic_api_key"
					autocomplete="new-password"
					placeholder="@if($keyConfigured){{ $__t('Configured – leave empty to keep unchanged') }}@else{{ $__t('Not configured') }}@endif">
				<small class="form-text text-muted">
					@if($keyConfigured)
					<span class="text-success"><i class="fa-solid fa-check"></i> {{ $__t('A key is currently configured') }}</span>
					@else
					<span class="text-danger"><i class="fa-solid fa-triangle-exclamation"></i> {{ $__t('No key configured yet') }}</span>
					@endif
				</small>
			</div>

			<div class="form-group">
				<label for="anthropic_model">{{ $__t('Model') }}</label>
				<input type="text"
					class="form-control"
					id="anthropic_model"
					name="anthropic_model"
					value="{{ $model }}">
			</div>

			<div class="form-group">
				<label for="receipt_digital_backend">{{ $__t('Analysis backend for digital invoices') }}</label>
				<select class="custom-control custom-select"
					id="receipt_digital_backend"
					name="receipt_digital_backend">
					<option value="anthropic" @if($digitalBackend == 'anthropic') selected="selected" @endif>{{ $__t('Anthropic (AI)') }}</option>
					<option value="parser" @if($digitalBackend == 'parser') selected="selected" @endif>{{ $__t('Rule-based parser (not implemented yet)') }}</option>
				</select>
				<small class="form-text text-muted">{{ $__t('Scanned/photographed receipts always use Anthropic (vision).') }}</small>
			</div>

			<button class="btn btn-success"
				id="save-receipt-import-settings">{{ $__t('Save') }}</button>
			<div id="receipt-import-settings-status"
				class="mt-2"></div>
		</form>
	</div>
</div>
@stop
