@extends('layout.default')

@section('title', $__t('Bulk purchase'))

@section('content')
<div class="row">
	<div class="col">
		<h2 class="title">@yield('title')</h2>
	</div>
</div>

<hr class="my-2">

<div class="row">
	<div class="col-lg-8 col-12">
		<p class="lead">{{ $__t('Import a whole receipt at once: upload a digital invoice (PDF) or a scan/photo, let it be analyzed, review the products and book them into stock – all linked to one receipt.') }}</p>

		@if(!$keyConfigured)
		<div class="alert alert-warning">
			<i class="fa-solid fa-triangle-exclamation"></i>
			{{ $__t('No Anthropic API key is configured yet. It is required to analyze receipts.') }}
			<a href="{{ $U('/receiptimportsettings') }}"
				class="alert-link">{{ $__t('Open settings') }}</a>
		</div>
		@else
		<div class="alert alert-success">
			<i class="fa-solid fa-check"></i>
			{{ $__t('Ready: an Anthropic API key is configured.') }}
			<a href="{{ $U('/receiptimportsettings') }}"
				class="alert-link">{{ $__t('Open settings') }}</a>
		</div>
		@endif

		<div class="card mt-3">
			<div class="card-body">
				<h5 class="card-title">{{ $__t('How it works') }}</h5>
				<ol class="mb-0 pl-3">
					<li>{{ $__t('Upload a digital invoice (PDF) or a scanned/photographed receipt') }}</li>
					<li>{{ $__t('The receipt is analyzed (products, quantities, prices, store, date)') }}</li>
					<li>{{ $__t('Review and correct the products, then book them into stock') }}</li>
					<li>{{ $__t('Everything is linked to one receipt and learned for next time') }}</li>
				</ol>
			</div>
		</div>

		<div class="alert alert-info mt-3 mb-0">
			<i class="fa-solid fa-screwdriver-wrench"></i>
			{{ $__t('The upload and review interface is being built here natively. Until then, the standalone import tool remains available.') }}
		</div>
	</div>
</div>
@stop
